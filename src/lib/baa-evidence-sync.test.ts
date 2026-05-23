import { describe, expect, it, vi, beforeEach } from "vitest";
import { BaaStatus, EvidenceSource, FrameworkSlug } from "@/generated/prisma";

const {
  frameworkFindUniqueMock,
  orgControlFindFirstMock,
  evidenceFindFirstMock,
  evidenceCreateMock,
  evidenceUpdateMock,
  evidenceDeleteManyMock,
  baaFindManyMock,
  triggerRecalcMock,
} = vi.hoisted(() => ({
  frameworkFindUniqueMock: vi.fn(),
  orgControlFindFirstMock: vi.fn(),
  evidenceFindFirstMock: vi.fn(),
  evidenceCreateMock: vi.fn(),
  evidenceUpdateMock: vi.fn(),
  evidenceDeleteManyMock: vi.fn(),
  baaFindManyMock: vi.fn(),
  triggerRecalcMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    framework: { findUnique: frameworkFindUniqueMock },
    orgControl: { findFirst: orgControlFindFirstMock },
    evidence: {
      findFirst: evidenceFindFirstMock,
      create: evidenceCreateMock,
      update: evidenceUpdateMock,
      deleteMany: evidenceDeleteManyMock,
      count: vi.fn(),
    },
    baaRecord: { findMany: baaFindManyMock },
  },
}));

vi.mock("@/lib/hipaa-scoring", () => ({
  computeExpiresAt: vi.fn(() => new Date("2026-08-20T00:00:00Z")),
  triggerHipaaScoreRecalculation: triggerRecalcMock,
}));

import {
  BAA_EVIDENCE_CONTROL_REF,
  ensureBaaEvidenceSynced,
  removeBaaAndRecalculateScore,
  syncBaaAndRecalculateScore,
  syncBaaEvidenceForRecord,
} from "@/lib/baa-evidence-sync";

const sampleBaa = {
  id: "baa_1",
  vendorName: "Twilio",
  status: BaaStatus.PENDING,
  signedAt: null,
  expiresAt: null,
  documentS3Key: null,
};

describe("baa-evidence-sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    frameworkFindUniqueMock.mockResolvedValue({ id: "fw_hipaa" });
    orgControlFindFirstMock.mockResolvedValue({ id: "oc_vendor" });
    evidenceFindFirstMock.mockResolvedValue(null);
    evidenceCreateMock.mockResolvedValue({ id: "ev_1" });
    baaFindManyMock.mockResolvedValue([sampleBaa]);
  });

  it("uses the vendor BAA HIPAA control ref", () => {
    expect(BAA_EVIDENCE_CONTROL_REF).toBe("164.314(a)(2)(i)-(iii)");
  });

  it("creates evidence linked to the vendor control", async () => {
    await syncBaaEvidenceForRecord("org_1", sampleBaa);

    expect(orgControlFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          frameworkControl: expect.objectContaining({
            controlRef: BAA_EVIDENCE_CONTROL_REF,
            frameworkId: "fw_hipaa",
          }),
        }),
      })
    );

    expect(evidenceCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: "org_1",
          orgControlId: "oc_vendor",
          title: "BAA: Twilio",
          sourceType: EvidenceSource.MANUAL,
          metadata: expect.objectContaining({ baaRecordId: "baa_1" }),
        }),
      })
    );
  });

  it("updates existing evidence for the same BAA", async () => {
    evidenceFindFirstMock.mockResolvedValue({ id: "ev_existing" });

    await syncBaaEvidenceForRecord("org_1", {
      ...sampleBaa,
      status: BaaStatus.SIGNED,
    });

    expect(evidenceUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ev_existing" },
      })
    );
    expect(evidenceCreateMock).not.toHaveBeenCalled();
  });

  it("syncs all BAAs in ensureBaaEvidenceSynced", async () => {
    await ensureBaaEvidenceSynced("org_1");
    expect(baaFindManyMock).toHaveBeenCalledWith({
      where: { organizationId: "org_1" },
      select: expect.any(Object),
    });
    expect(evidenceCreateMock).toHaveBeenCalledTimes(1);
  });

  it("recalculates score after BAA create sync", async () => {
    await syncBaaAndRecalculateScore("org_1", sampleBaa);
    expect(triggerRecalcMock).toHaveBeenCalledWith("org_1");
  });

  it("recalculates score after BAA delete", async () => {
    await removeBaaAndRecalculateScore("org_1", "baa_1");
    expect(evidenceDeleteManyMock).toHaveBeenCalled();
    expect(triggerRecalcMock).toHaveBeenCalledWith("org_1");
  });

  it("skips sync when HIPAA vendor control is missing", async () => {
    orgControlFindFirstMock.mockResolvedValue(null);
    await syncBaaEvidenceForRecord("org_1", sampleBaa);
    expect(evidenceCreateMock).not.toHaveBeenCalled();
  });
});
