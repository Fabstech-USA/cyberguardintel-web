/**
 * Shared loader for HIPAA overview score + contribution + status rollup.
 * Used by the dashboard RSC and the readiness-score poll API.
 */

import { FrameworkSlug, PolicyStatus } from "@/generated/prisma";
import {
  buildControlStatusRollup,
  type ControlStatusRollup,
} from "@/lib/dashboard-control-status";
import { prisma } from "@/lib/prisma";
import {
  buildReadinessScoreBreakdown,
  type ReadinessScoreBreakdown,
} from "@/lib/readiness-score-breakdown";
import type { ControlScoreSnapshot } from "@/lib/hipaa-scoring-core";

export type HipaaOverviewSnapshot = {
  score: number;
  scoreUpdatedAt: string | null;
  breakdown: ReadinessScoreBreakdown;
  statusRollup: ControlStatusRollup;
  controlsWithEvidence: number;
  controlCount: number;
};

export async function loadHipaaOverviewSnapshot(
  organizationId: string
): Promise<HipaaOverviewSnapshot> {
  const framework = await prisma.framework.findUnique({
    where: { slug: FrameworkSlug.HIPAA },
    select: { id: true },
  });

  if (!framework) {
    return emptySnapshot();
  }

  const [orgFramework, orgControls, approvedPolicies] = await Promise.all([
    prisma.orgFramework.findUnique({
      where: {
        organizationId_frameworkId: {
          organizationId,
          frameworkId: framework.id,
        },
      },
      select: { score: true, scoreUpdatedAt: true },
    }),
    prisma.orgControl.findMany({
      where: {
        organizationId,
        frameworkControl: { framework: { slug: FrameworkSlug.HIPAA } },
      },
      select: {
        ownerId: true,
        status: true,
        frameworkControl: { select: { controlRef: true } },
        evidence: {
          where: { isValid: true },
          select: {
            expiresAt: true,
            collectedAt: true,
            metadata: true,
          },
        },
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

  const snapshots: ControlScoreSnapshot[] = orgControls.map((row) => ({
    controlRef: row.frameworkControl.controlRef,
    ownerId: row.ownerId,
    evidence: row.evidence,
    status: row.status,
  }));

  return {
    score: orgFramework?.score ?? 0,
    scoreUpdatedAt: orgFramework?.scoreUpdatedAt?.toISOString() ?? null,
    breakdown: buildReadinessScoreBreakdown(snapshots, approvedPolicies),
    statusRollup: buildControlStatusRollup(orgControls.map((r) => r.status)),
    controlsWithEvidence: orgControls.filter((r) => r.evidence.length > 0)
      .length,
    controlCount: orgControls.length,
  };
}

function emptySnapshot(): HipaaOverviewSnapshot {
  return {
    score: 0,
    scoreUpdatedAt: null,
    breakdown: buildReadinessScoreBreakdown([], 0),
    statusRollup: buildControlStatusRollup([]),
    controlsWithEvidence: 0,
    controlCount: 0,
  };
}
