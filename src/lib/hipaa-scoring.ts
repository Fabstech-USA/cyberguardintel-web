import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import {
  FrameworkSlug,
  PolicyStatus,
  type Evidence,
} from "@/generated/prisma";
import { HIPAA_POLICY_TARGET } from "@/lib/hipaa-policy-catalog";
import { prisma } from "@/lib/prisma";

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

export type EvidenceFreshnessInput = Pick<
  Evidence,
  "expiresAt" | "collectedAt" | "metadata"
>;

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

/**
 * Recalculate HIPAA readiness (Section 7.4), persist OrgFramework.score and
 * per-control OrgControl.score, and return the overall 0–100 score.
 */
export async function recalculateHipaaScore(
  organizationId: string
): Promise<number> {
  const framework = await prisma.framework.findUnique({
    where: { slug: FrameworkSlug.HIPAA },
    select: { id: true },
  });

  if (!framework) return 0;

  const orgFramework = await prisma.orgFramework.findUnique({
    where: {
      organizationId_frameworkId: {
        organizationId,
        frameworkId: framework.id,
      },
    },
  });

  if (!orgFramework) return 0;

  const [controls, approvedCount] = await Promise.all([
    prisma.orgControl.findMany({
      where: {
        organizationId,
        frameworkControl: { framework: { slug: FrameworkSlug.HIPAA } },
      },
      include: {
        evidence: { where: { isValid: true } },
      },
    }),
    prisma.policy.count({
      where: {
        organizationId,
        frameworkSlug: FrameworkSlug.HIPAA,
        status: PolicyStatus.APPROVED,
      },
    }),
  ]);

  const policyScore = Math.min(1, approvedCount / HIPAA_POLICY_TARGET);
  const now = new Date();

  const perControlScores = controls.map((control) => ({
    id: control.id,
    score: scoreControl({
      evidence: control.evidence,
      policyScore,
      ownerId: control.ownerId,
      now,
    }),
  }));

  const overall =
    perControlScores.length > 0
      ? (perControlScores.reduce((sum, row) => sum + row.score, 0) /
          perControlScores.length) *
        100
      : 0;

  const roundedOverall = Math.round(overall * 10) / 10;

  await prisma.$transaction([
    ...perControlScores.map((row) =>
      prisma.orgControl.update({
        where: { id: row.id },
        data: { score: Math.round(row.score * 1000) / 10 },
      })
    ),
    prisma.orgFramework.update({
      where: { id: orgFramework.id },
      data: {
        score: roundedOverall,
        scoreUpdatedAt: now,
      },
    }),
  ]);

  return roundedOverall;
}

/** Run scoring and invalidate the dashboard cache for RSC consumers. */
export async function triggerHipaaScoreRecalculation(
  organizationId: string
): Promise<number> {
  const score = await recalculateHipaaScore(organizationId);
  revalidatePath("/dashboard");
  return score;
}
