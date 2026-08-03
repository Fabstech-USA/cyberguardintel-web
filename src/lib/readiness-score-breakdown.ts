/**
 * Human-readable readiness score contribution: what is earned vs still missing.
 * Uses the same weights and freshness rules as `scoreControl`.
 */

import { HIPAA_POLICY_TARGET } from "@/lib/hipaa-policy-catalog";
import {
  WEIGHTS,
  isEvidenceFresh,
  type ControlScoreSnapshot,
  type EvidenceFreshnessInput,
} from "@/lib/hipaa-scoring-core";

export type ReadinessFactorId =
  | "evidence_completeness"
  | "evidence_freshness"
  | "policy_approved"
  | "owner_assigned";

export type ReadinessFactorBreakdown = {
  id: ReadinessFactorId;
  label: string;
  /** Max points this factor can add to the 0–100 org score. */
  maxPoints: number;
  /** Points currently earned from this factor (0–maxPoints). */
  earnedPoints: number;
  /** Points still available (maxPoints − earnedPoints). */
  missingPoints: number;
  /** Plain-language progress, e.g. "12 of 48 controls have evidence". */
  statusLabel: string;
  /** Plain-language gap, or null when this factor is fully earned. */
  missingLabel: string | null;
  /** Deep link when something is still missing. */
  href: string | null;
  ctaLabel: string | null;
};

export type ReadinessScoreBreakdown = {
  /** Sum of factor earned points; matches overall readiness (one decimal). */
  earnedTotal: number;
  /** Sum of factor missing points. */
  missingTotal: number;
  factors: ReadinessFactorBreakdown[];
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function controlFreshnessRatio(
  evidence: readonly EvidenceFreshnessInput[],
  now: Date
): number {
  if (evidence.length === 0) return 0;
  const freshCount = evidence.filter((e) => isEvidenceFresh(e, now)).length;
  return freshCount / evidence.length;
}

/**
 * Break the org readiness score into the four weighted factors so the UI can
 * show what is contributing today and what is still missing.
 */
export function buildReadinessScoreBreakdown(
  controls: ReadonlyArray<ControlScoreSnapshot>,
  approvedPolicyCount: number,
  now: Date = new Date()
): ReadinessScoreBreakdown {
  const n = controls.length;
  const maxCompleteness = WEIGHTS.evidence_completeness * 100;
  const maxFreshness = WEIGHTS.evidence_freshness * 100;
  const maxPolicy = WEIGHTS.policy_approved * 100;
  const maxOwner = WEIGHTS.owner_assigned * 100;

  if (n === 0) {
    const factors: ReadinessFactorBreakdown[] = [
      {
        id: "evidence_completeness",
        label: "Evidence on controls",
        maxPoints: maxCompleteness,
        earnedPoints: 0,
        missingPoints: maxCompleteness,
        statusLabel: "No HIPAA controls enrolled yet",
        missingLabel: "Enroll HIPAA controls to start scoring evidence",
        href: "/hipaa/controls",
        ctaLabel: "View controls",
      },
      {
        id: "evidence_freshness",
        label: "Evidence freshness",
        maxPoints: maxFreshness,
        earnedPoints: 0,
        missingPoints: maxFreshness,
        statusLabel: "No evidence to check yet",
        missingLabel: "Add evidence so freshness can count toward your score",
        href: "/integrations",
        ctaLabel: "Connect tools",
      },
      {
        id: "policy_approved",
        label: "Approved policies",
        maxPoints: maxPolicy,
        earnedPoints: 0,
        missingPoints: maxPolicy,
        statusLabel: `0 of ${HIPAA_POLICY_TARGET} policies approved`,
        missingLabel: `Approve ${HIPAA_POLICY_TARGET} HIPAA policies to earn the full policy share`,
        href: "/hipaa/policies",
        ctaLabel: "Review policies",
      },
      {
        id: "owner_assigned",
        label: "Control owners",
        maxPoints: maxOwner,
        earnedPoints: 0,
        missingPoints: maxOwner,
        statusLabel: "No controls to assign",
        missingLabel: "Assign an owner on each control once enrolled",
        href: "/hipaa/controls",
        ctaLabel: "Assign owners",
      },
    ];
    return {
      earnedTotal: 0,
      missingTotal: round1(
        maxCompleteness + maxFreshness + maxPolicy + maxOwner
      ),
      factors,
    };
  }

  const withEvidence = controls.filter((c) => c.evidence.length > 0).length;
  const withoutEvidence = n - withEvidence;
  const completenessAvg = withEvidence / n;
  const earnedCompleteness = round1(completenessAvg * maxCompleteness);

  const freshnessAvg =
    controls.reduce(
      (sum, c) => sum + controlFreshnessRatio(c.evidence, now),
      0
    ) / n;
  const earnedFreshness = round1(freshnessAvg * maxFreshness);

  let totalEvidence = 0;
  let freshEvidence = 0;
  let controlsWithStale = 0;
  for (const control of controls) {
    if (control.evidence.length === 0) continue;
    totalEvidence += control.evidence.length;
    const fresh = control.evidence.filter((e) =>
      isEvidenceFresh(e, now)
    ).length;
    freshEvidence += fresh;
    if (fresh < control.evidence.length) controlsWithStale += 1;
  }

  const policyScore = Math.min(1, approvedPolicyCount / HIPAA_POLICY_TARGET);
  const earnedPolicy = round1(policyScore * maxPolicy);
  const missingApprovals = Math.max(
    0,
    HIPAA_POLICY_TARGET - approvedPolicyCount
  );

  const withOwner = controls.filter((c) => Boolean(c.ownerId)).length;
  const withoutOwner = n - withOwner;
  const ownerAvg = withOwner / n;
  const earnedOwner = round1(ownerAvg * maxOwner);

  const factors: ReadinessFactorBreakdown[] = [
    {
      id: "evidence_completeness",
      label: "Evidence on controls",
      maxPoints: maxCompleteness,
      earnedPoints: earnedCompleteness,
      missingPoints: round1(maxCompleteness - earnedCompleteness),
      statusLabel: `${withEvidence} of ${n} controls have evidence`,
      missingLabel:
        withoutEvidence > 0
          ? `${withoutEvidence} control${withoutEvidence === 1 ? "" : "s"} still need at least one evidence item`
          : null,
      href: withoutEvidence > 0 ? "/integrations" : null,
      ctaLabel: withoutEvidence > 0 ? "Add evidence" : null,
    },
    {
      id: "evidence_freshness",
      label: "Evidence freshness",
      maxPoints: maxFreshness,
      earnedPoints: earnedFreshness,
      missingPoints: round1(maxFreshness - earnedFreshness),
      statusLabel:
        totalEvidence === 0
          ? "No evidence items yet"
          : `${freshEvidence} of ${totalEvidence} evidence items are current`,
      missingLabel:
        totalEvidence === 0
          ? "Add evidence first. Freshness counts once items exist."
          : controlsWithStale > 0
            ? `${controlsWithStale} control${controlsWithStale === 1 ? "" : "s"} ${controlsWithStale === 1 ? "has" : "have"} outdated evidence to refresh`
            : withoutEvidence > 0
              ? "Controls without evidence cannot earn freshness points"
              : null,
      href:
        totalEvidence === 0
          ? "/integrations"
          : controlsWithStale > 0
            ? "/evidence?freshness=stale"
            : withoutEvidence > 0
              ? "/hipaa/controls"
              : null,
      ctaLabel:
        totalEvidence === 0
          ? "Connect tools"
          : controlsWithStale > 0
            ? "Refresh evidence"
            : withoutEvidence > 0
              ? "Cover gaps"
              : null,
    },
    {
      id: "policy_approved",
      label: "Approved policies",
      maxPoints: maxPolicy,
      earnedPoints: earnedPolicy,
      missingPoints: round1(maxPolicy - earnedPolicy),
      statusLabel: `${Math.min(approvedPolicyCount, HIPAA_POLICY_TARGET)} of ${HIPAA_POLICY_TARGET} policies approved`,
      missingLabel:
        missingApprovals > 0
          ? `${missingApprovals} more approved polic${missingApprovals === 1 ? "y" : "ies"} to reach the full policy share`
          : null,
      href: missingApprovals > 0 ? "/hipaa/policies" : null,
      ctaLabel: missingApprovals > 0 ? "Review policies" : null,
    },
    {
      id: "owner_assigned",
      label: "Control owners",
      maxPoints: maxOwner,
      earnedPoints: earnedOwner,
      missingPoints: round1(maxOwner - earnedOwner),
      statusLabel: `${withOwner} of ${n} controls have an owner`,
      missingLabel:
        withoutOwner > 0
          ? `${withoutOwner} control${withoutOwner === 1 ? "" : "s"} still need an owner`
          : null,
      href: withoutOwner > 0 ? "/hipaa/controls" : null,
      ctaLabel: withoutOwner > 0 ? "Assign owners" : null,
    },
  ];

  const earnedTotal = round1(
    factors.reduce((sum, f) => sum + f.earnedPoints, 0)
  );
  const missingTotal = round1(
    factors.reduce((sum, f) => sum + f.missingPoints, 0)
  );

  return { earnedTotal, missingTotal, factors };
}
