import { describe, expect, it } from "vitest";
import { BAA_EVIDENCE_CONTROL_REF } from "@/lib/baa-control-ref";
import {
  buildDashboardNextSteps,
  TYPICAL_FIRST_INTEGRATION_CONTROL_REFS,
} from "@/lib/dashboard-next-steps";
import {
  computeOverallReadinessScore,
  estimateEvidenceCoverageScoreGain,
  estimateOwnerAssignmentScoreGain,
  estimatePolicyApprovalScoreGain,
  type ControlScoreSnapshot,
} from "@/lib/hipaa-scoring-core";

const now = new Date("2026-07-15T12:00:00Z");

function emptyControls(count: number): ControlScoreSnapshot[] {
  return Array.from({ length: count }, (_, i) => ({
    controlRef: `ref-${i}`,
    ownerId: null,
    evidence: [],
  }));
}

function controlsWithRefs(refs: string[]): ControlScoreSnapshot[] {
  return refs.map((controlRef) => ({
    controlRef,
    ownerId: null,
    evidence: [],
  }));
}

describe("readiness score estimates", () => {
  it("gains exactly 20 points when approving all policies from zero", () => {
    const controls = emptyControls(10);
    expect(computeOverallReadinessScore(controls, 0, now)).toBe(0);
    expect(estimatePolicyApprovalScoreGain(controls, 0, 18, now)).toBe(20);
  });

  it("gains evidence coverage points only for empty matching controls", () => {
    const controls = controlsWithRefs([
      ...TYPICAL_FIRST_INTEGRATION_CONTROL_REFS,
      "other-ref",
    ]);
    const gain = estimateEvidenceCoverageScoreGain(
      controls,
      0,
      TYPICAL_FIRST_INTEGRATION_CONTROL_REFS,
      now
    );
    expect(gain).toBeGreaterThan(0);
    // Covering again should yield 0 once evidence exists
    const after = controls.map((c) =>
      TYPICAL_FIRST_INTEGRATION_CONTROL_REFS.includes(
        c.controlRef as (typeof TYPICAL_FIRST_INTEGRATION_CONTROL_REFS)[number]
      )
        ? {
            ...c,
            evidence: [
              {
                expiresAt: new Date("2026-08-15T12:00:00Z"),
                collectedAt: now,
                metadata: { evidenceType: "config" },
              },
            ],
          }
        : c
    );
    expect(
      estimateEvidenceCoverageScoreGain(
        after,
        0,
        TYPICAL_FIRST_INTEGRATION_CONTROL_REFS,
        now
      )
    ).toBe(0);
  });

  it("gains 10 points when assigning owners to all unowned controls from zero", () => {
    const controls = emptyControls(10);
    expect(estimateOwnerAssignmentScoreGain(controls, 0, now)).toBe(10);
    const owned = controls.map((c) => ({ ...c, ownerId: "user_1" }));
    expect(estimateOwnerAssignmentScoreGain(owned, 0, now)).toBe(0);
  });
});

describe("buildDashboardNextSteps", () => {
  it("orders by estimated points and omits completed work", () => {
    const controls = [
      ...controlsWithRefs([...TYPICAL_FIRST_INTEGRATION_CONTROL_REFS]),
      {
        controlRef: BAA_EVIDENCE_CONTROL_REF,
        ownerId: null,
        evidence: [] as ControlScoreSnapshot["evidence"],
      },
      ...emptyControls(5),
    ];

    const steps = buildDashboardNextSteps({
      controls,
      approvedPolicyCount: 0,
      unapprovedPolicyCount: 0,
      hasConnectedIntegration: false,
      hasSignedBaa: false,
      hasRiskAssessment: false,
      now,
    });

    expect(steps.length).toBeGreaterThanOrEqual(3);
    expect(steps[0]?.estimatedPoints ?? 0).toBeGreaterThanOrEqual(
      steps[1]?.estimatedPoints ?? 0
    );
    expect(steps.every((s, i) => s.order === i + 1)).toBe(true);
    expect(steps.some((s) => s.id === "policies")).toBe(true);
    expect(steps.some((s) => s.id === "integrations")).toBe(true);
    expect(steps.some((s) => s.id === "baa")).toBe(true);
    expect(steps.some((s) => s.id === "control-owners")).toBe(true);
    expect(steps.find((s) => s.id === "risk-assessment")?.estimatedPoints).toBe(
      0
    );
    expect(steps.find((s) => s.id === "risk-assessment")?.subtitle).toContain(
      "Implemented"
    );
  });

  it("hides finished tasks and prefers approve copy when drafts exist", () => {
    const steps = buildDashboardNextSteps({
      controls: emptyControls(8),
      approvedPolicyCount: 10,
      unapprovedPolicyCount: 4,
      hasConnectedIntegration: true,
      hasSignedBaa: true,
      hasRiskAssessment: true,
      now,
    });

    expect(steps.some((s) => s.id === "integrations")).toBe(false);
    expect(steps.some((s) => s.id === "baa")).toBe(false);
    expect(steps.some((s) => s.id === "risk-assessment")).toBe(false);
    expect(steps.some((s) => s.id === "evidence-gaps")).toBe(true);
    expect(steps.some((s) => s.id === "risk-assessment-update")).toBe(true);
    const policies = steps.find((s) => s.id === "policies");
    expect(policies?.title).toBe("Approve draft policies");
    expect(policies?.estimatedPoints).toBeGreaterThan(0);
    expect(policies?.subtitle).toMatch(/\+/);
  });

  it("surfaces assign control owners when unowned and points remain", () => {
    const steps = buildDashboardNextSteps({
      controls: emptyControls(8),
      approvedPolicyCount: 18,
      unapprovedPolicyCount: 0,
      hasConnectedIntegration: true,
      hasSignedBaa: true,
      hasRiskAssessment: true,
      now,
    });

    const owners = steps.find((s) => s.id === "control-owners");
    expect(owners).toBeDefined();
    expect(owners?.href).toBe("/hipaa/controls");
    expect(owners?.ctaLabel).toBe("Assign");
    expect(owners?.estimatedPoints).toBeGreaterThan(0);
  });

  it("returns empty list when nothing meaningful remains", () => {
    const covered = emptyControls(3).map((c, i) => ({
      ...c,
      ownerId: "user_1",
      status: "IMPLEMENTED",
      evidence: [
        {
          expiresAt: new Date("2026-08-15T12:00:00Z"),
          collectedAt: now,
          metadata: { evidenceType: "config" },
        },
      ],
      controlRef: `done-${i}`,
    }));
    const steps = buildDashboardNextSteps({
      controls: covered,
      approvedPolicyCount: 18,
      unapprovedPolicyCount: 0,
      hasConnectedIntegration: true,
      hasSignedBaa: true,
      hasRiskAssessment: true,
      now,
    });
    expect(steps).toEqual([]);
  });

  it("nudges confirming status when evidence and owner exist", () => {
    const steps = buildDashboardNextSteps({
      controls: [
        {
          controlRef: "164.312(d)",
          ownerId: "user_1",
          status: "IN_PROGRESS",
          evidence: [
            {
              expiresAt: new Date("2026-08-15T12:00:00Z"),
              collectedAt: now,
              metadata: { evidenceType: "config" },
            },
          ],
        },
      ],
      approvedPolicyCount: 18,
      unapprovedPolicyCount: 0,
      hasConnectedIntegration: true,
      hasSignedBaa: true,
      hasRiskAssessment: true,
      now,
    });
    expect(steps.some((s) => s.id === "mark-implemented")).toBe(true);
    expect(
      steps.find((s) => s.id === "mark-implemented")?.estimatedPoints
    ).toBe(0);
  });
});
