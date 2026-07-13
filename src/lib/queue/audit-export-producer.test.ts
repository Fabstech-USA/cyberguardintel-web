import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  auditExportJobCreateMock,
  auditExportJobUpdateMock,
  queueAddMock,
  QueueMock,
} = vi.hoisted(() => {
  const queueAddMock = vi.fn();
  const QueueMock = vi.fn(function QueueMock() {
    return { add: queueAddMock };
  });
  return {
    auditExportJobCreateMock: vi.fn(),
    auditExportJobUpdateMock: vi.fn(),
    queueAddMock,
    QueueMock,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditExportJob: {
      create: auditExportJobCreateMock,
      update: auditExportJobUpdateMock,
    },
  },
}));

vi.mock("bullmq", () => ({
  Queue: QueueMock,
}));

vi.mock("@/lib/queue/connection", () => ({
  getRedisConnectionOptions: vi.fn(() => ({ url: "redis://localhost:6379" })),
}));

import {
  enqueueAuditExportJob,
  resetAuditExportQueueForTests,
} from "@/lib/queue/audit-export-producer";

describe("enqueueAuditExportJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAuditExportQueueForTests();
    auditExportJobCreateMock.mockResolvedValue({ id: "exp_1" });
    queueAddMock.mockResolvedValue({ id: "exp_1" });
    auditExportJobUpdateMock.mockResolvedValue({});
  });

  it("creates an AuditExportJob and enqueues BullMQ work", async () => {
    const from = new Date("2025-01-01T00:00:00.000Z");
    const to = new Date("2026-01-01T00:00:00.000Z");

    const result = await enqueueAuditExportJob({
      organizationId: "org_1",
      from,
      to,
      controlRefs: ["164.312(a)(1)"],
    });

    expect(result).toEqual({ jobId: "exp_1", status: "QUEUED" });
    expect(auditExportJobCreateMock).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org_1",
        fromDate: from,
        toDate: to,
        controlRefs: ["164.312(a)(1)"],
        sections: expect.arrayContaining(["evidence", "readme"]),
        status: "QUEUED",
        progressSteps: expect.any(Array),
      }),
    });
    expect(queueAddMock).toHaveBeenCalledWith(
      "package",
      expect.objectContaining({
        auditExportJobId: "exp_1",
        organizationId: "org_1",
        controlRefs: ["164.312(a)(1)"],
        sections: expect.arrayContaining(["readme"]),
      }),
      { jobId: "exp_1" }
    );
  });
});
