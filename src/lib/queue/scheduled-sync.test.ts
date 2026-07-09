import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntegrationStatus } from "@/generated/prisma";

const {
  integrationFindManyMock,
  integrationUpdateMock,
  collectionJobUpdateManyMock,
  enqueueCollectionJobMock,
} = vi.hoisted(() => ({
  integrationFindManyMock: vi.fn(),
  integrationUpdateMock: vi.fn(),
  collectionJobUpdateManyMock: vi.fn(),
  enqueueCollectionJobMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    integration: {
      findMany: integrationFindManyMock,
      update: integrationUpdateMock,
    },
    collectionJob: {
      updateMany: collectionJobUpdateManyMock,
    },
  },
}));

vi.mock("@/lib/queue/producer", () => ({
  enqueueCollectionJob: enqueueCollectionJobMock,
}));

import { enqueueScheduledIntegrationSyncs } from "@/lib/queue/scheduled-sync";

describe("enqueueScheduledIntegrationSyncs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    integrationFindManyMock.mockResolvedValue([
      { id: "int_1", organizationId: "org_1", type: "stub" },
      { id: "int_2", organizationId: "org_2", type: "aws" },
    ]);
    enqueueCollectionJobMock.mockResolvedValue({ jobId: "job_1", status: "QUEUED" });
    integrationUpdateMock.mockResolvedValue({});
    collectionJobUpdateManyMock.mockResolvedValue({ count: 1 });
  });

  it("enqueues INCREMENTAL jobs for all ACTIVE integrations", async () => {
    const result = await enqueueScheduledIntegrationSyncs();

    expect(integrationFindManyMock).toHaveBeenCalledWith({
      where: { status: IntegrationStatus.ACTIVE },
      select: { id: true, organizationId: true, type: true },
    });
    expect(enqueueCollectionJobMock).toHaveBeenCalledTimes(2);
    expect(enqueueCollectionJobMock).toHaveBeenNthCalledWith(1, {
      organizationId: "org_1",
      integrationId: "int_1",
      jobType: "INCREMENTAL",
    });
    expect(enqueueCollectionJobMock).toHaveBeenNthCalledWith(2, {
      organizationId: "org_2",
      integrationId: "int_2",
      jobType: "INCREMENTAL",
    });
    expect(result).toEqual({
      scanned: 2,
      enqueued: 2,
      failed: 0,
      failures: [],
    });
  });

  it("continues batch when one enqueue fails and surfaces errors", async () => {
    enqueueCollectionJobMock
      .mockRejectedValueOnce(new Error("Redis unavailable"))
      .mockResolvedValueOnce({ jobId: "job_2", status: "QUEUED" });

    const result = await enqueueScheduledIntegrationSyncs();

    expect(result).toEqual({
      scanned: 2,
      enqueued: 1,
      failed: 1,
      failures: [
        {
          integrationId: "int_1",
          organizationId: "org_1",
          error: "Redis unavailable",
        },
      ],
    });
    expect(integrationUpdateMock).toHaveBeenCalledWith({
      where: { id: "int_1" },
      data: { errorMessage: "Redis unavailable" },
    });
    expect(collectionJobUpdateManyMock).toHaveBeenCalledWith({
      where: {
        integrationId: "int_1",
        organizationId: "org_1",
        status: "QUEUED",
        bullmqJobId: null,
      },
      data: expect.objectContaining({
        status: "FAILED",
        errorMessage: "Redis unavailable",
      }),
    });
  });
});
