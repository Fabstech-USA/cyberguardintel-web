import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  evidenceFindFirstMock,
  getObjectFromS3Mock,
  writeAuditLogMock,
} = vi.hoisted(() => ({
  evidenceFindFirstMock: vi.fn(),
  getObjectFromS3Mock: vi.fn(),
  writeAuditLogMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    evidence: { findFirst: evidenceFindFirstMock },
  },
}));

vi.mock("@/lib/s3", () => ({
  getObjectFromS3: getObjectFromS3Mock,
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

import { hashEvidence } from "@/lib/crypto";

import { GET } from "./route";

describe("GET /api/evidence/[id]/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    evidenceFindFirstMock.mockResolvedValue({
      id: "ev_1",
      title: "IAM report",
      s3Key: "orgs/org_1/controls/oc_1/abc-file.pdf",
      fileHash: "abc123",
      mimeType: "application/pdf",
    });
  });

  it("rejects download when hash verification fails", async () => {
    getObjectFromS3Mock.mockResolvedValue({
      body: Buffer.from("tampered"),
      contentType: "application/pdf",
      metadata: { sha256: "different" },
    });

    const res = await GET(new Request("http://localhost/download"), {
      params: Promise.resolve({ id: "ev_1" }),
    });

    expect(res.status).toBe(409);
    expect(writeAuditLogMock).not.toHaveBeenCalled();
  });

  it("streams file when hash verification succeeds", async () => {
    const body = Buffer.from("verified-content");
    evidenceFindFirstMock.mockResolvedValue({
      id: "ev_1",
      title: "IAM report",
      s3Key: "orgs/org_1/controls/oc_1/abc-file.pdf",
      fileHash: hashEvidence(body),
      mimeType: "application/pdf",
    });
    getObjectFromS3Mock.mockResolvedValue({
      body,
      contentType: "application/pdf",
      metadata: { sha256: "nomatch" },
    });

    const res = await GET(new Request("http://localhost/download"), {
      params: Promise.resolve({ id: "ev_1" }),
    });

    expect(res.status).toBe(200);
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "evidence.downloaded",
        resourceId: "ev_1",
      })
    );
    expect(res.headers.get("X-Evidence-Hash")).toBeTruthy();
  });
});
