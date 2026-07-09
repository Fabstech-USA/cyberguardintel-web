import { beforeEach, describe, expect, it, vi } from "vitest";
import { EvidenceSource, IntegrationStatus } from "@/generated/prisma";

const {
  collectionJobUpdateMock,
  integrationFindFirstMock,
  integrationUpdateMock,
  orgControlFindFirstMock,
  evidenceFindFirstMock,
  createEvidenceMock,
  writeAuditLogAwaitMock,
  callAiServiceMock,
  uploadEvidenceFileMock,
  decryptCredentialsMock,
} = vi.hoisted(() => ({
  collectionJobUpdateMock: vi.fn(),
  integrationFindFirstMock: vi.fn(),
  integrationUpdateMock: vi.fn(),
  orgControlFindFirstMock: vi.fn(),
  evidenceFindFirstMock: vi.fn(),
  createEvidenceMock: vi.fn(),
  writeAuditLogAwaitMock: vi.fn(),
  callAiServiceMock: vi.fn(),
  uploadEvidenceFileMock: vi.fn(),
  decryptCredentialsMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    collectionJob: { update: collectionJobUpdateMock },
    integration: {
      findFirst: integrationFindFirstMock,
      update: integrationUpdateMock,
    },
    orgControl: { findFirst: orgControlFindFirstMock },
    evidence: { findFirst: evidenceFindFirstMock },
  },
}));

vi.mock("@/lib/ai-client", () => ({
  callAiService: callAiServiceMock,
}));

vi.mock("@/lib/crypto", () => ({
  decryptCredentials: decryptCredentialsMock,
}));

vi.mock("@/lib/evidence-mutations", () => ({
  createEvidence: createEvidenceMock,
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLogAwait: writeAuditLogAwaitMock,
}));

vi.mock("@/lib/s3", () => ({
  uploadEvidenceFile: uploadEvidenceFileMock,
}));

import { processCollectionJob } from "@/lib/queue/processor";

const payload = {
  collectionJobId: "job_1",
  organizationId: "org_1",
  integrationId: "int_1",
  jobType: "INCREMENTAL" as const,
};

const sampleItem = {
  title: "Fixture evidence",
  description: "From stub connector",
  control_refs: ["164.312(b)"],
  evidence_type: "report",
  raw_data: { source: "stub", fixture: true },
  collected_at: "2026-06-18T12:00:00.000Z",
  file_content_b64: Buffer.from("fixture").toString("base64"),
  mime_type: "application/pdf",
  expiry_days: 90,
};

describe("processCollectionJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collectionJobUpdateMock.mockResolvedValue({});
    integrationFindFirstMock.mockResolvedValue({
      id: "int_1",
      type: "stub",
      status: IntegrationStatus.ACTIVE,
      encryptedCreds: "encrypted",
      config: { fixture: true },
      lastSyncAt: null,
    });
    decryptCredentialsMock.mockReturnValue("{}");
    callAiServiceMock.mockResolvedValue({
      valid: true,
      items: [sampleItem],
    });
    orgControlFindFirstMock.mockResolvedValue({ id: "oc_1" });
    evidenceFindFirstMock.mockResolvedValue(null);
    uploadEvidenceFileMock.mockResolvedValue({
      s3Key: "orgs/org_1/controls/oc_1/abc-fixture.bin",
      fileHash: "abc",
    });
    createEvidenceMock.mockResolvedValue({ id: "ev_1" });
    writeAuditLogAwaitMock.mockResolvedValue(undefined);
    integrationUpdateMock.mockResolvedValue({});
  });

  it("creates evidence, audit log, and marks job completed", async () => {
    const result = await processCollectionJob(payload);

    expect(result).toEqual({ status: "completed", evidenceAdded: 1 });
    expect(callAiServiceMock).toHaveBeenCalledWith("/integrations/collect", {
      integration_type: "stub",
      credentials: {},
      config: { fixture: true },
      since: null,
    });
    expect(createEvidenceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org_1",
        orgControlId: "oc_1",
        sourceType: EvidenceSource.INTEGRATION,
        integrationId: "int_1",
        fileHash: expect.any(String),
        metadata: sampleItem.raw_data,
      })
    );
    expect(writeAuditLogAwaitMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "evidence.created",
        resourceId: "ev_1",
      })
    );
    expect(integrationUpdateMock).toHaveBeenCalledWith({
      where: { id: "int_1" },
      data: expect.objectContaining({
        lastSyncStatus: "success",
        lastSyncCount: 1,
      }),
    });
    expect(collectionJobUpdateMock).toHaveBeenLastCalledWith({
      where: { id: "job_1" },
      data: expect.objectContaining({
        status: "COMPLETED",
        evidenceAdded: 1,
      }),
    });
  });

  it("skips duplicate evidence by fileHash", async () => {
    evidenceFindFirstMock.mockResolvedValue({ id: "existing" });

    const result = await processCollectionJob(payload);

    expect(result.evidenceAdded).toBe(0);
    expect(createEvidenceMock).not.toHaveBeenCalled();
    expect(writeAuditLogAwaitMock).not.toHaveBeenCalled();
    expect(integrationUpdateMock).toHaveBeenCalledWith({
      where: { id: "int_1" },
      data: expect.objectContaining({
        lastSyncStatus: "partial",
        lastSyncCount: 0,
      }),
    });
  });

  it("marks integration error when credentials are invalid", async () => {
    callAiServiceMock.mockResolvedValue({
      valid: false,
      items: [],
      error: "Credential validation failed",
    });

    const result = await processCollectionJob(payload);

    expect(result.status).toBe("error");
    expect(integrationUpdateMock).toHaveBeenCalledWith({
      where: { id: "int_1" },
      data: expect.objectContaining({
        status: IntegrationStatus.ERROR,
        lastSyncStatus: "error",
      }),
    });
  });
});
