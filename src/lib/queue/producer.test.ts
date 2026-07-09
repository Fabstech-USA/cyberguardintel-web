import { beforeEach, describe, expect, it, vi } from "vitest";
import { IntegrationStatus } from "@/generated/prisma";

const {
  integrationFindFirstMock,
  collectionJobCreateMock,
  collectionJobUpdateMock,
  queueAddMock,
  QueueMock,
} = vi.hoisted(() => {
  const queueAddMock = vi.fn();
  const QueueMock = vi.fn(function QueueMock() {
    return { add: queueAddMock };
  });
  return {
    integrationFindFirstMock: vi.fn(),
    collectionJobCreateMock: vi.fn(),
    collectionJobUpdateMock: vi.fn(),
    queueAddMock,
    QueueMock,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    integration: { findFirst: integrationFindFirstMock },
    collectionJob: {
      create: collectionJobCreateMock,
      update: collectionJobUpdateMock,
    },
  },
}));

vi.mock("bullmq", () => ({
  Queue: QueueMock,
}));

vi.mock("@/lib/queue/connection", () => ({
  getRedisConnectionOptions: vi.fn(() => ({ url: "redis://localhost:6379" })),
}));

import { enqueueCollectionJob, resetQueueForTests } from "@/lib/queue/producer";

describe("enqueueCollectionJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetQueueForTests();
    integrationFindFirstMock.mockResolvedValue({
      id: "int_1",
      status: IntegrationStatus.ACTIVE,
    });
    collectionJobCreateMock.mockResolvedValue({ id: "job_1" });
    queueAddMock.mockResolvedValue({ id: "job_1" });
    collectionJobUpdateMock.mockResolvedValue({});
  });

  it("creates a CollectionJob and enqueues BullMQ work", async () => {
    const result = await enqueueCollectionJob({
      organizationId: "org_1",
      integrationId: "int_1",
      jobType: "INCREMENTAL",
    });

    expect(result).toEqual({ jobId: "job_1", status: "QUEUED" });
    expect(collectionJobCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org_1",
        integrationId: "int_1",
        jobType: "INCREMENTAL",
        status: "QUEUED",
      }),
    });
    expect(queueAddMock).toHaveBeenCalledWith(
      "collect",
      expect.objectContaining({
        collectionJobId: "job_1",
        organizationId: "org_1",
        integrationId: "int_1",
      }),
      { jobId: "job_1" }
    );
    expect(collectionJobUpdateMock).toHaveBeenCalledWith({
      where: { id: "job_1" },
      data: { bullmqJobId: "job_1" },
    });
  });

  it("rejects inactive integrations", async () => {
    integrationFindFirstMock.mockResolvedValue({
      id: "int_1",
      status: IntegrationStatus.PAUSED,
    });

    await expect(
      enqueueCollectionJob({
        organizationId: "org_1",
        integrationId: "int_1",
      })
    ).rejects.toThrow("Integration is not active");
  });
});
