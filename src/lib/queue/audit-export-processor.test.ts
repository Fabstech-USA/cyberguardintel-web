import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  auditExportJobFindUniqueMock,
  auditExportJobUpdateMock,
  buildAndUploadAuditPackageMock,
} = vi.hoisted(() => ({
  auditExportJobFindUniqueMock: vi.fn(),
  auditExportJobUpdateMock: vi.fn(),
  buildAndUploadAuditPackageMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditExportJob: {
      findUnique: auditExportJobFindUniqueMock,
      update: auditExportJobUpdateMock,
    },
  },
}));

vi.mock("@/lib/audit-package", () => ({
  buildAndUploadAuditPackage: buildAndUploadAuditPackageMock,
}));

import { processAuditExportJob } from "@/lib/queue/audit-export-processor";

describe("processAuditExportJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditExportJobFindUniqueMock.mockResolvedValue({
      id: "exp_1",
      organizationId: "org_1",
      status: "QUEUED",
      sections: [],
    });
    auditExportJobUpdateMock.mockResolvedValue({});
    buildAndUploadAuditPackageMock.mockResolvedValue({
      s3Key: "orgs/org_1/audit-packages/2026-07-12-exp_1.zip",
      evidenceCount: 1,
      evidenceSkipped: 0,
      policyCount: 1,
      hasRiskAssessment: true,
      baaCount: 1,
      trainingCount: 1,
      auditLogCount: 1,
    });
  });

  it("marks job COMPLETED with s3Key on success", async () => {
    const result = await processAuditExportJob({
      auditExportJobId: "exp_1",
      organizationId: "org_1",
      from: "2025-01-01T00:00:00.000Z",
      to: "2026-01-01T00:00:00.000Z",
      controlRefs: [],
      sections: [],
    });

    expect(result).toEqual({
      status: "COMPLETED",
      s3Key: "orgs/org_1/audit-packages/2026-07-12-exp_1.zip",
    });
    expect(buildAndUploadAuditPackageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_1",
        exportJobId: "exp_1",
      })
    );
    expect(auditExportJobUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "exp_1" },
        data: expect.objectContaining({
          status: "COMPLETED",
          s3Key: "orgs/org_1/audit-packages/2026-07-12-exp_1.zip",
        }),
      })
    );
  });

  it("marks job FAILED when packaging throws", async () => {
    buildAndUploadAuditPackageMock.mockRejectedValue(new Error("S3 down"));

    const result = await processAuditExportJob({
      auditExportJobId: "exp_1",
      organizationId: "org_1",
      from: "2025-01-01T00:00:00.000Z",
      to: "2026-01-01T00:00:00.000Z",
      controlRefs: [],
      sections: [],
    });

    expect(result).toEqual({ status: "FAILED" });
    expect(auditExportJobUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "FAILED",
          errorMessage: "S3 down",
        }),
      })
    );
  });
});
