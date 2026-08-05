/** HIPAA safeguard families shown on the MVP dashboard (matches product mock). */

import { ControlStatus } from "@/generated/prisma";
import { HIPAA_POLICY_TARGET } from "@/lib/hipaa-policy-catalog";
import {
  isEvidenceFresh,
  type EvidenceFreshnessInput,
} from "@/lib/hipaa-scoring-core";

export const SAFEGUARD_BUCKETS = [
  "Administrative",
  "Physical",
  "Technical",
  "Organizational",
] as const;

export type SafeguardBucket = (typeof SAFEGUARD_BUCKETS)[number];

export function isSafeguardBucket(value: string): value is SafeguardBucket {
  return (SAFEGUARD_BUCKETS as readonly string[]).includes(value);
}

type ControlRow = {
  score: number;
  category: string;
};

export type SafeguardControlInput = {
  score: number;
  category: string;
  ownerId: string | null;
  evidence: EvidenceFreshnessInput[];
  status?: ControlStatus | string;
};

export type SafeguardFactorStat = {
  label: string;
  /** Count toward the positive / covered side. */
  available: number;
  /** Count still missing or outdated. */
  missing: number;
  /** Unit shown in hover copy, e.g. "controls" or "items". */
  unit: string;
};

export type SafeguardStatusMix = {
  notStarted: number;
  inProgress: number;
  implemented: number;
  needsReview: number;
  exception: number;
};

export type SafeguardBucketSummary = {
  bucket: SafeguardBucket;
  score: number;
  controlCount: number;
  factors: SafeguardFactorStat[];
  statusMix: SafeguardStatusMix;
};

export type BuildSafeguardBucketSummariesOptions = {
  approvedPolicyCount?: number;
  policyTarget?: number;
  now?: Date;
};

/**
 * Map `FrameworkControl.category` (free-form string from seed/content) into one
 * of four dashboard buckets. Unknown values roll up to Administrative so the UI
 * always shows four bars.
 */
export function bucketForCategory(category: string): SafeguardBucket {
  const c = category.toLowerCase();
  if (c.includes("physical")) return "Physical";
  if (c.includes("technical")) return "Technical";
  if (c.includes("organizational")) return "Organizational";
  if (c.includes("administrative")) return "Administrative";
  return "Administrative";
}

/**
 * Per-bucket score: average of `OrgControl.score` for controls in that bucket.
 * Empty bucket → 0. Display as 0–100 to match readiness mock.
 */
export function aggregateSafeguardScores(
  controls: ControlRow[]
): Record<SafeguardBucket, number> {
  const summaries = buildSafeguardBucketSummaries(
    controls.map((row) => ({
      score: row.score,
      category: row.category,
      ownerId: null,
      evidence: [],
    }))
  );
  const out = {} as Record<SafeguardBucket, number>;
  for (const summary of summaries) {
    out[summary.bucket] = summary.score;
  }
  return out;
}

function emptyStatusMix(): SafeguardStatusMix {
  return {
    notStarted: 0,
    inProgress: 0,
    implemented: 0,
    needsReview: 0,
    exception: 0,
  };
}

function bumpStatusMix(
  mix: SafeguardStatusMix,
  status: ControlStatus | string | undefined
): void {
  switch (status) {
    case ControlStatus.IN_PROGRESS:
    case "IN_PROGRESS":
      mix.inProgress += 1;
      break;
    case ControlStatus.IMPLEMENTED:
    case "IMPLEMENTED":
      mix.implemented += 1;
      break;
    case ControlStatus.NEEDS_REVIEW:
    case "NEEDS_REVIEW":
      mix.needsReview += 1;
      break;
    case ControlStatus.EXCEPTION:
    case "EXCEPTION":
      mix.exception += 1;
      break;
    default:
      mix.notStarted += 1;
      break;
  }
}

/**
 * Score plus available/missing factor counts for each safeguard bucket.
 * Used by dashboard rings (hover breakdown + click-through filters).
 */
export function buildSafeguardBucketSummaries(
  controls: ReadonlyArray<SafeguardControlInput>,
  options: BuildSafeguardBucketSummariesOptions | Date = {}
): SafeguardBucketSummary[] {
  // Back-compat: older call sites passed `now` as the second arg.
  const opts: BuildSafeguardBucketSummariesOptions =
    options instanceof Date ? { now: options } : options;
  const now = opts.now ?? new Date();
  const policyTarget = opts.policyTarget ?? HIPAA_POLICY_TARGET;
  const approvedPolicyCount = Math.min(
    opts.approvedPolicyCount ?? 0,
    policyTarget
  );
  const missingPolicies = Math.max(0, policyTarget - approvedPolicyCount);

  const groups: Record<
    SafeguardBucket,
    {
      scores: number[];
      withEvidence: number;
      withoutEvidence: number;
      freshItems: number;
      staleItems: number;
      withOwner: number;
      withoutOwner: number;
      statusMix: SafeguardStatusMix;
    }
  > = {
    Administrative: emptyGroup(),
    Physical: emptyGroup(),
    Technical: emptyGroup(),
    Organizational: emptyGroup(),
  };

  for (const row of controls) {
    const bucket = bucketForCategory(row.category);
    const group = groups[bucket];
    group.scores.push(row.score);
    bumpStatusMix(group.statusMix, row.status);

    if (row.evidence.length > 0) {
      group.withEvidence += 1;
      for (const item of row.evidence) {
        if (isEvidenceFresh(item, now)) group.freshItems += 1;
        else group.staleItems += 1;
      }
    } else {
      group.withoutEvidence += 1;
    }

    if (row.ownerId) group.withOwner += 1;
    else group.withoutOwner += 1;
  }

  return SAFEGUARD_BUCKETS.map((bucket) => {
    const group = groups[bucket];
    const n = group.scores.length;
    const score =
      n === 0
        ? 0
        : Math.round(group.scores.reduce((sum, s) => sum + s, 0) / n);

    return {
      bucket,
      score,
      controlCount: n,
      statusMix: group.statusMix,
      factors: [
        {
          label: "Evidence on controls",
          available: group.withEvidence,
          missing: group.withoutEvidence,
          unit: "controls",
        },
        {
          label: "Evidence freshness",
          available: group.freshItems,
          missing: group.staleItems,
          unit: "items",
        },
        {
          label: "Approved policies (org-wide)",
          available: approvedPolicyCount,
          missing: missingPolicies,
          unit: "policies",
        },
        {
          label: "Control owners",
          available: group.withOwner,
          missing: group.withoutOwner,
          unit: "controls",
        },
      ],
    };
  });
}

function emptyGroup() {
  return {
    scores: [] as number[],
    withEvidence: 0,
    withoutEvidence: 0,
    freshItems: 0,
    staleItems: 0,
    withOwner: 0,
    withoutOwner: 0,
    statusMix: emptyStatusMix(),
  };
}
