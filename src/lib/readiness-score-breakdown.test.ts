import { describe, expect, it } from "vitest";
import { HIPAA_POLICY_TARGET } from "@/lib/hipaa-policy-catalog";
import { computeOverallReadinessScore } from "@/lib/hipaa-scoring-core";
import { buildReadinessScoreBreakdown } from "@/lib/readiness-score-breakdown";
import type { ControlScoreSnapshot } from "@/lib/hipaa-scoring-core";

const now = new Date("2026-05-22T12:00:00Z");

function control(
  partial: Partial<ControlScoreSnapshot> & { controlRef: string }
): ControlScoreSnapshot {
  return {
    ownerId: null,
    evidence: [],
    ...partial,
  };
}

describe("buildReadinessScoreBreakdown", () => {
  it("returns zeroed factors when there are no controls", () => {
    const breakdown = buildReadinessScoreBreakdown([], 0, now);
    expect(breakdown.earnedTotal).toBe(0);
    expect(breakdown.missingTotal).toBe(100);
    expect(breakdown.factors).toHaveLength(4);
    expect(
      breakdown.factors.every((f) => f.earnedPoints === 0 && f.missingPoints > 0)
    ).toBe(true);
  });

  it("matches overall readiness as the sum of earned factors", () => {
    const controls: ControlScoreSnapshot[] = [
      control({
        controlRef: "a",
        ownerId: "u1",
        evidence: [
          {
            expiresAt: new Date("2026-06-01T00:00:00Z"),
            collectedAt: now,
            metadata: { evidenceType: "config" },
          },
        ],
      }),
      control({
        controlRef: "b",
        ownerId: null,
        evidence: [],
      }),
    ];
    const approved = 9;
    const breakdown = buildReadinessScoreBreakdown(controls, approved, now);
    const overall = computeOverallReadinessScore(controls, approved, now);
    expect(breakdown.earnedTotal).toBe(overall);
    expect(roundish(breakdown.earnedTotal + breakdown.missingTotal)).toBe(100);
  });

  it("reports policy progress against the HIPAA target", () => {
    const controls = [
      control({
        controlRef: "a",
        ownerId: "u1",
        evidence: [
          {
            expiresAt: new Date("2026-06-01T00:00:00Z"),
            collectedAt: now,
            metadata: null,
          },
        ],
      }),
    ];
    const breakdown = buildReadinessScoreBreakdown(controls, 0, now);
    const policy = breakdown.factors.find((f) => f.id === "policy_approved");
    expect(policy?.statusLabel).toBe(
      `0 of ${HIPAA_POLICY_TARGET} policies approved`
    );
    expect(policy?.earnedPoints).toBe(0);
    expect(policy?.missingPoints).toBe(20);
    expect(policy?.href).toBe("/hipaa/policies");
  });

  it("marks complete factors without a missing label or CTA", () => {
    const controls = Array.from({ length: 2 }, (_, i) =>
      control({
        controlRef: `c${i}`,
        ownerId: `u${i}`,
        evidence: [
          {
            expiresAt: new Date("2026-12-01T00:00:00Z"),
            collectedAt: now,
            metadata: { evidenceType: "config" },
          },
        ],
      })
    );
    const breakdown = buildReadinessScoreBreakdown(
      controls,
      HIPAA_POLICY_TARGET,
      now
    );
    expect(breakdown.missingTotal).toBe(0);
    for (const factor of breakdown.factors) {
      expect(factor.missingLabel).toBeNull();
      expect(factor.href).toBeNull();
      expect(factor.earnedPoints).toBe(factor.maxPoints);
    }
  });

  it("surfaces stale evidence in the freshness factor", () => {
    const controls = [
      control({
        controlRef: "stale",
        ownerId: "u1",
        evidence: [
          {
            expiresAt: new Date("2026-01-01T00:00:00Z"),
            collectedAt: new Date("2025-01-01T00:00:00Z"),
            metadata: { evidenceType: "log" },
          },
        ],
      }),
    ];
    const breakdown = buildReadinessScoreBreakdown(
      controls,
      HIPAA_POLICY_TARGET,
      now
    );
    const freshness = breakdown.factors.find(
      (f) => f.id === "evidence_freshness"
    );
    expect(freshness?.earnedPoints).toBe(0);
    expect(freshness?.statusLabel).toBe("0 of 1 evidence items are current");
    expect(freshness?.missingLabel).toMatch(/outdated evidence/i);
    expect(freshness?.ctaLabel).toBe("Refresh evidence");
    expect(freshness?.href).toBe("/evidence?freshness=stale");
  });
});

function roundish(value: number): number {
  return Math.round(value * 10) / 10;
}
