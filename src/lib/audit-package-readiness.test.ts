import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {},
}));

import {
  computePercentReady,
  scoreAuditLogReadiness,
  scoreBaaReadiness,
  scoreEvidenceReadiness,
  scorePoliciesReadiness,
  scoreRiskReadiness,
  scorePhiMapReadiness,
  scoreTrainingReadiness,
  type ReadinessSection,
} from "@/lib/audit-package-readiness";
import {
  AUDIT_PACKAGE_SECTION_IDS,
  initialProgressSteps,
  normalizeAuditPackageSections,
} from "@/lib/audit-package-sections";

describe("audit-package-readiness scorers", () => {
  it("scores evidence", () => {
    expect(scoreEvidenceReadiness({ total: 0, withS3: 0 }).state).toBe("danger");
    expect(scoreEvidenceReadiness({ total: 2, withS3: 0 }).state).toBe("partial");
    expect(scoreEvidenceReadiness({ total: 2, withS3: 1 }).state).toBe("partial");
    expect(scoreEvidenceReadiness({ total: 2, withS3: 2 }).state).toBe("ok");
  });

  it("scores policies", () => {
    expect(scorePoliciesReadiness({ approvedCount: 0, approvedWithPdf: 0 }).state).toBe(
      "danger"
    );
    expect(scorePoliciesReadiness({ approvedCount: 2, approvedWithPdf: 0 }).state).toBe(
      "partial"
    );
    expect(scorePoliciesReadiness({ approvedCount: 2, approvedWithPdf: 2 }).state).toBe(
      "ok"
    );
  });

  it("scores risk, baa, training, audit log", () => {
    expect(scoreRiskReadiness({ hasApproved: false }).state).toBe("danger");
    expect(scoreRiskReadiness({ hasApproved: true, version: 1 }).count).toBe(
      "v1"
    );
    expect(scoreRiskReadiness({ hasApproved: true, version: 1 }).state).toBe(
      "ok"
    );
    expect(
      scoreBaaReadiness({ total: 0, signed: 0, expired: 0, pending: 0 }).state
    ).toBe("danger");
    expect(
      scoreBaaReadiness({ total: 2, signed: 2, expired: 0, pending: 0 }).count
    ).toBe("2 signed");
    expect(
      scoreBaaReadiness({ total: 3, signed: 1, expired: 1, pending: 1 }).state
    ).toBe("partial");
    expect(scoreTrainingReadiness({ total: 0, overdue: 0 }).state).toBe("danger");
    expect(scoreTrainingReadiness({ total: 5, overdue: 1 }).state).toBe("partial");
    expect(scoreTrainingReadiness({ total: 5, overdue: 0 }).count).toBe(
      "5 records"
    );
    expect(scoreAuditLogReadiness(0).state).toBe("danger");
    expect(scoreAuditLogReadiness(3).count).toBe("3 entries");
    expect(scorePhiMapReadiness({ systemCount: 0, edgeCount: 0 }).state).toBe(
      "danger"
    );
    expect(scorePhiMapReadiness({ systemCount: 4, edgeCount: 0 }).state).toBe(
      "partial"
    );
    expect(scorePhiMapReadiness({ systemCount: 4, edgeCount: 3 }).count).toBe(
      "4 systems"
    );
    expect(scorePhiMapReadiness({ systemCount: 4, edgeCount: 3 }).state).toBe(
      "ok"
    );
  });

  it("computes percent ready with partial weight", () => {
    const sections: ReadinessSection[] = AUDIT_PACKAGE_SECTION_IDS.map((id, i) => ({
      id,
      label: id,
      count: "",
      state: i < 2 ? "ok" : i < 4 ? "partial" : "danger",
      reason: "",
    }));
    // 2 ok + 2 partial*0.5 + 4 danger = 3 / 8 = 37.5 → 38
    expect(computePercentReady(sections)).toBe(38);
  });
});

describe("audit-package-sections", () => {
  it("always includes readme when normalizing", () => {
    expect(normalizeAuditPackageSections(["evidence"])).toEqual([
      "evidence",
      "readme",
    ]);
  });

  it("builds progress steps from selected sections", () => {
    const steps = initialProgressSteps(["evidence", "policies", "readme"]);
    expect(steps.map((s) => s.id)).toEqual([
      "load",
      "evidence",
      "policies",
      "readme",
      "upload",
    ]);
  });
});
