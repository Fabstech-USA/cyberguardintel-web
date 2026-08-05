import { addDays } from "date-fns";
import { HIPAA_POLICY_TARGET } from "@/lib/hipaa-policy-catalog";

export const WEIGHTS = {
  evidence_completeness: 0.45,
  evidence_freshness: 0.25,
  policy_approved: 0.2,
  owner_assigned: 0.1,
} as const;

export const FRESHNESS_DAYS = {
  access_review: 90,
  vulnerability_scan: 30,
  config: 180,
  log: 30,
  training: 365,
  report: 90,
} as const;

export type FreshnessEvidenceType = keyof typeof FRESHNESS_DAYS;

export type EvidenceFreshnessInput = {
  expiresAt: Date | null;
  collectedAt: Date;
  metadata: unknown;
};

function getMetadataEvidenceType(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>).evidenceType;
  return typeof value === "string" ? value : null;
}

export function isFreshnessEvidenceType(
  value: string
): value is FreshnessEvidenceType {
  return value in FRESHNESS_DAYS;
}

/** Compute expiry from collectedAt + FRESHNESS_DAYS when evidence is written. */
export function computeExpiresAt(
  collectedAt: Date,
  evidenceType: string
): Date | null {
  if (!isFreshnessEvidenceType(evidenceType)) return null;
  return addDays(collectedAt, FRESHNESS_DAYS[evidenceType]);
}

/** True when evidence is within its validity window (expiresAt or type-based fallback). */
export function isEvidenceFresh(
  evidence: EvidenceFreshnessInput,
  now: Date = new Date()
): boolean {
  if (evidence.expiresAt) {
    return evidence.expiresAt.getTime() > now.getTime();
  }

  const evidenceType = getMetadataEvidenceType(evidence.metadata);
  if (evidenceType && isFreshnessEvidenceType(evidenceType)) {
    const expiresAt = computeExpiresAt(evidence.collectedAt, evidenceType);
    return expiresAt !== null && expiresAt.getTime() > now.getTime();
  }

  // No expiry metadata — treat as always fresh per architecture §7.4
  return true;
}

export function scoreControl(params: {
  evidence: EvidenceFreshnessInput[];
  policyScore: number;
  ownerId: string | null;
  now?: Date;
}): number {
  const { evidence, policyScore, ownerId, now = new Date() } = params;
  const completeness = evidence.length > 0 ? 1.0 : 0.0;
  const freshCount = evidence.filter((e) => isEvidenceFresh(e, now)).length;
  const freshness = evidence.length > 0 ? freshCount / evidence.length : 0;
  const ownerScore = ownerId ? 1.0 : 0.0;

  return (
    completeness * WEIGHTS.evidence_completeness +
    freshness * WEIGHTS.evidence_freshness +
    policyScore * WEIGHTS.policy_approved +
    ownerScore * WEIGHTS.owner_assigned
  );
}

export type ControlScoreSnapshot = {
  controlRef: string;
  ownerId: string | null;
  evidence: EvidenceFreshnessInput[];
  /** Optional; ignored by the readiness formula, used by dashboard next-steps. */
  status?: string;
};

/** Overall readiness 0–100 (one decimal), matching `recalculateHipaaScore`. */
export function computeOverallReadinessScore(
  controls: ReadonlyArray<ControlScoreSnapshot>,
  approvedPolicyCount: number,
  now: Date = new Date()
): number {
  if (controls.length === 0) return 0;
  const policyScore = Math.min(1, approvedPolicyCount / HIPAA_POLICY_TARGET);
  const sum = controls.reduce(
    (acc, control) =>
      acc +
      scoreControl({
        evidence: control.evidence,
        policyScore,
        ownerId: control.ownerId,
        now,
      }),
    0
  );
  return Math.round((sum / controls.length) * 1000) / 10;
}

/** Points gained on the 0–100 readiness score when approving `additionalApprovals` more policies. */
export function estimatePolicyApprovalScoreGain(
  controls: ReadonlyArray<ControlScoreSnapshot>,
  approvedPolicyCount: number,
  additionalApprovals: number,
  now: Date = new Date()
): number {
  if (additionalApprovals <= 0 || controls.length === 0) return 0;
  const before = computeOverallReadinessScore(
    controls,
    approvedPolicyCount,
    now
  );
  const after = computeOverallReadinessScore(
    controls,
    Math.min(HIPAA_POLICY_TARGET, approvedPolicyCount + additionalApprovals),
    now
  );
  return Math.max(0, Math.round((after - before) * 10) / 10);
}

/**
 * Points gained if listed controlRefs that currently have no evidence each get
 * one fresh evidence item (e.g. first integration sync / first signed BAA).
 */
export function estimateEvidenceCoverageScoreGain(
  controls: ReadonlyArray<ControlScoreSnapshot>,
  approvedPolicyCount: number,
  controlRefsToCover: ReadonlyArray<string>,
  now: Date = new Date()
): number {
  if (controls.length === 0 || controlRefsToCover.length === 0) return 0;
  const refs = new Set(controlRefsToCover);
  const before = computeOverallReadinessScore(
    controls,
    approvedPolicyCount,
    now
  );
  const syntheticFresh: EvidenceFreshnessInput = {
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    collectedAt: now,
    metadata: { evidenceType: "config" },
  };
  const projected = controls.map((control) => {
    if (!refs.has(control.controlRef) || control.evidence.length > 0) {
      return control;
    }
    return {
      ...control,
      evidence: [syntheticFresh],
    };
  });
  const after = computeOverallReadinessScore(
    projected,
    approvedPolicyCount,
    now
  );
  return Math.max(0, Math.round((after - before) * 10) / 10);
}

/**
 * Points gained if every currently unowned control gets an owner assigned.
 */
export function estimateOwnerAssignmentScoreGain(
  controls: ReadonlyArray<ControlScoreSnapshot>,
  approvedPolicyCount: number,
  now: Date = new Date()
): number {
  if (controls.length === 0) return 0;
  const unowned = controls.filter((c) => !c.ownerId);
  if (unowned.length === 0) return 0;

  const before = computeOverallReadinessScore(
    controls,
    approvedPolicyCount,
    now
  );
  const projected = controls.map((control) =>
    control.ownerId
      ? control
      : { ...control, ownerId: "synthetic-owner" }
  );
  const after = computeOverallReadinessScore(
    projected,
    approvedPolicyCount,
    now
  );
  return Math.max(0, Math.round((after - before) * 10) / 10);
}
