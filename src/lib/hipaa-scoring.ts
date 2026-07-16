import { revalidatePath } from "next/cache";
import { FrameworkSlug, PolicyStatus } from "@/generated/prisma";
import { HIPAA_POLICY_TARGET } from "@/lib/hipaa-policy-catalog";
import { scoreControl } from "@/lib/hipaa-scoring-core";
import { prisma } from "@/lib/prisma";

export {
  WEIGHTS,
  FRESHNESS_DAYS,
  computeExpiresAt,
  computeOverallReadinessScore,
  estimateEvidenceCoverageScoreGain,
  estimateOwnerAssignmentScoreGain,
  estimatePolicyApprovalScoreGain,
  isEvidenceFresh,
  isFreshnessEvidenceType,
  scoreControl,
  type ControlScoreSnapshot,
  type EvidenceFreshnessInput,
  type FreshnessEvidenceType,
} from "@/lib/hipaa-scoring-core";

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
  try {
    revalidatePath("/dashboard");
  } catch {
    // No-op outside a Next.js request (BullMQ worker, tsx scripts).
  }
  return score;
}
