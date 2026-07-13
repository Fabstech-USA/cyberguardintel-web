import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  auditExportJobFindFirstMock,
  organizationFindUniqueMock,
  getSignedDownloadUrlMock,
  sendEmailMock,
  writeAuditLogMock,
} = vi.hoisted(() => ({
  auditExportJobFindFirstMock: vi.fn(),
  organizationFindUniqueMock: vi.fn(),
  getSignedDownloadUrlMock: vi.fn(),
  sendEmailMock: vi.fn(),
  writeAuditLogMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditExportJob: { findFirst: auditExportJobFindFirstMock },
    organization: { findUnique: organizationFindUniqueMock },
  },
}));

vi.mock("@/lib/s3", () => ({
  getSignedDownloadUrl: getSignedDownloadUrlMock,
}));

vi.mock("@/lib/email", () => ({
  sendEmail: sendEmailMock,
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

import { POST } from "./route";

describe("POST /api/audit/export/email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auditExportJobFindFirstMock.mockResolvedValue({
      id: "exp_1",
      organizationId: "org_1",
      status: "COMPLETED",
      s3Key: "orgs/org_1/audit-packages/2026-07-12-exp_1.zip",
      fromDate: new Date("2025-01-01"),
      toDate: new Date("2026-01-01"),
    });
    organizationFindUniqueMock.mockResolvedValue({ name: "Clinic" });
    getSignedDownloadUrlMock.mockResolvedValue("https://s3.example/signed.zip");
    sendEmailMock.mockResolvedValue({ id: "email_1" });
  });

  it("emails signed URL and writes audit log", async () => {
    const res = await POST(
      new Request("http://localhost/api/audit/export/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: "exp_1", to: "auditor@firm.com" }),
      })
    );

    expect(res.status).toBe(200);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "auditor@firm.com",
        html: expect.stringContaining("https://s3.example/signed.zip"),
      })
    );
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "audit_package.emailed",
        resourceId: "exp_1",
        metadata: expect.objectContaining({
          to: "auditor@firm.com",
          s3Key: "orgs/org_1/audit-packages/2026-07-12-exp_1.zip",
        }),
      })
    );
  });

  it("rejects invalid email", async () => {
    const res = await POST(
      new Request("http://localhost/api/audit/export/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: "exp_1", to: "not-an-email" }),
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when job is not completed", async () => {
    auditExportJobFindFirstMock.mockResolvedValue(null);
    const res = await POST(
      new Request("http://localhost/api/audit/export/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: "exp_missing", to: "a@b.com" }),
      })
    );
    expect(res.status).toBe(404);
  });
});
