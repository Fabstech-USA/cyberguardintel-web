import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  enqueueAuditExportJobMock,
  auditExportJobFindFirstMock,
  getSignedDownloadUrlMock,
  writeAuditLogMock,
} = vi.hoisted(() => ({
  enqueueAuditExportJobMock: vi.fn(),
  auditExportJobFindFirstMock: vi.fn(),
  getSignedDownloadUrlMock: vi.fn(),
  writeAuditLogMock: vi.fn(),
}));

vi.mock("@/lib/queue/audit-export-producer", () => ({
  enqueueAuditExportJob: enqueueAuditExportJobMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditExportJob: { findFirst: auditExportJobFindFirstMock },
  },
}));

vi.mock("@/lib/s3", () => ({
  getSignedDownloadUrl: getSignedDownloadUrlMock,
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: writeAuditLogMock,
}));

vi.mock("@/lib/tenant", () => ({
  withTenant:
    (handler: (req: Request, ctx: unknown) => Promise<Response>) =>
    (req: Request) =>
      handler(req, {
        organizationId: "org_1",
        clerkUserId: "user_1",
        orgRole: "ADMIN",
      }),
}));

import { GET, POST } from "./route";

describe("/api/audit/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    enqueueAuditExportJobMock.mockResolvedValue({
      jobId: "exp_1",
      status: "QUEUED",
    });
    getSignedDownloadUrlMock.mockResolvedValue(
      "https://s3.example/signed.zip"
    );
  });

  it("POST enqueues an export job", async () => {
    const res = await POST(
      new Request("http://localhost/api/audit/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "2025-01-01",
          to: "2026-01-01",
          controlRefs: ["164.312(a)(1)"],
        }),
      })
    );

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body).toEqual({ jobId: "exp_1", status: "QUEUED" });
    expect(enqueueAuditExportJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_1",
        controlRefs: ["164.312(a)(1)"],
      })
    );
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "audit_package.requested",
        resourceId: "exp_1",
      })
    );
  });

  it("POST rejects invalid range", async () => {
    const res = await POST(
      new Request("http://localhost/api/audit/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: "2026-01-01", to: "2025-01-01" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("GET returns signedUrl and progress steps when COMPLETED", async () => {
    auditExportJobFindFirstMock.mockResolvedValue({
      id: "exp_1",
      organizationId: "org_1",
      status: "COMPLETED",
      fromDate: new Date("2025-01-01"),
      toDate: new Date("2026-01-01"),
      controlRefs: [],
      sections: ["evidence", "readme"],
      progressSteps: [
        { id: "load", label: "Load", status: "done" },
        { id: "upload", label: "Upload", status: "done" },
      ],
      currentStep: null,
      s3Key: "orgs/org_1/audit-packages/2026-07-12-exp_1.zip",
      errorMessage: null,
      createdAt: new Date(),
      startedAt: new Date(),
      completedAt: new Date(),
    });

    const res = await GET(
      new Request("http://localhost/api/audit/export?jobId=exp_1")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("COMPLETED");
    expect(body.signedUrl).toBe("https://s3.example/signed.zip");
    expect(body.steps).toHaveLength(2);
    expect(body.progressPercent).toBe(100);
    expect(getSignedDownloadUrlMock).toHaveBeenCalledWith(
      "orgs/org_1/audit-packages/2026-07-12-exp_1.zip"
    );
  });

  it("GET returns running progress percent from steps", async () => {
    auditExportJobFindFirstMock.mockResolvedValue({
      id: "exp_1",
      organizationId: "org_1",
      status: "RUNNING",
      fromDate: new Date("2025-01-01"),
      toDate: new Date("2026-01-01"),
      controlRefs: [],
      sections: [],
      progressSteps: [
        { id: "load", label: "Load", status: "done" },
        { id: "evidence", label: "Evidence", status: "running" },
        { id: "upload", label: "Upload", status: "pending" },
      ],
      currentStep: "evidence",
      s3Key: null,
      errorMessage: null,
      createdAt: new Date(),
      startedAt: new Date(),
      completedAt: null,
    });

    const res = await GET(
      new Request("http://localhost/api/audit/export?jobId=exp_1")
    );
    const body = await res.json();
    expect(body.status).toBe("RUNNING");
    expect(body.currentStep).toBe("evidence");
    expect(body.progressPercent).toBe(33);
  });

  it("GET returns 404 for unknown job (tenant scoped)", async () => {
    auditExportJobFindFirstMock.mockResolvedValue(null);
    const res = await GET(
      new Request("http://localhost/api/audit/export?jobId=other")
    );
    expect(res.status).toBe(404);
    expect(auditExportJobFindFirstMock).toHaveBeenCalledWith({
      where: { id: "other", organizationId: "org_1" },
    });
  });
});
