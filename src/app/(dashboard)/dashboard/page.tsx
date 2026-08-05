import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  BaaStatus,
  FrameworkSlug,
  IntegrationStatus,
  PolicyStatus,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { userShouldRunOrgOnboardingWizard } from "@/lib/clerk-org-onboarding";
import { ensureOrganizationSyncedFromClerk } from "@/lib/clerk-webhook-sync";
import { buildControlStatusRollup } from "@/lib/dashboard-control-status";
import { buildDashboardNextSteps } from "@/lib/dashboard-next-steps";
import { buildSafeguardBucketSummaries } from "@/lib/dashboard-safeguards";
import { buildReadinessScoreBreakdown } from "@/lib/readiness-score-breakdown";
import { DashboardFrameworkTabs } from "@/components/dashboard/DashboardFrameworkTabs";
import { HipaaWorkspaceNav } from "@/components/dashboard/HipaaWorkspaceNav";
import { DashboardMetricStrip } from "@/components/dashboard/DashboardMetricStrip";
import { NextUpSection } from "@/components/dashboard/NextUpSection";
import { DashboardReadinessLive } from "@/components/dashboard/DashboardReadinessLive";
import { ControlStatusRollupSection } from "@/components/dashboard/ControlStatusRollupSection";
import { SafeguardBreakdownSection } from "@/components/dashboard/SafeguardBreakdownSection";
import { HIPAA_POLICY_TARGET } from "@/lib/hipaa-policy-catalog";
import type { ControlScoreSnapshot } from "@/lib/hipaa-scoring-core";

export default async function DashboardHomePage(): Promise<React.JSX.Element> {
  const { userId, orgId } = await auth();

  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/post-auth");

  let org = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    include: {
      frameworks: {
        include: {
          framework: { select: { slug: true, name: true } },
        },
      },
      _count: {
        select: {
          evidence: true,
          baaRecords: true,
          trainingRecords: true,
        },
      },
    },
  });

  if (!org) {
    await ensureOrganizationSyncedFromClerk(orgId);
    org = await prisma.organization.findUnique({
      where: { clerkOrgId: orgId },
      include: {
        frameworks: {
          include: {
            framework: { select: { slug: true, name: true } },
          },
        },
        _count: {
          select: {
            evidence: true,
            baaRecords: true,
            trainingRecords: true,
          },
        },
      },
    });
  }

  if (!org) redirect("/post-auth");

  if (org.onboardingStep !== null) {
    const runOrgWizard = await userShouldRunOrgOnboardingWizard(userId, orgId);
    if (runOrgWizard) {
      redirect("/onboarding");
    }
  }

  const hipaaEnrollment = org.frameworks.find(
    (f) => f.framework.slug === FrameworkSlug.HIPAA
  );
  const readinessScore = hipaaEnrollment?.score ?? 0;

  const [
    orgControls,
    approvedPolicies,
    unapprovedPolicies,
    connectedIntegrations,
    signedBaas,
    latestRiskAssessment,
  ] = await Promise.all([
    prisma.orgControl.findMany({
      where: {
        organizationId: org.id,
        frameworkControl: {
          framework: { slug: FrameworkSlug.HIPAA },
        },
      },
      select: {
        score: true,
        ownerId: true,
        status: true,
        frameworkControl: { select: { category: true, controlRef: true } },
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
        organizationId: org.id,
        frameworkSlug: FrameworkSlug.HIPAA,
        status: PolicyStatus.APPROVED,
      },
    }),
    prisma.policy.count({
      where: {
        organizationId: org.id,
        frameworkSlug: FrameworkSlug.HIPAA,
        status: { in: [PolicyStatus.DRAFT, PolicyStatus.UNDER_REVIEW] },
      },
    }),
    prisma.integration.count({
      where: {
        organizationId: org.id,
        status: {
          in: [
            IntegrationStatus.ACTIVE,
            IntegrationStatus.PAUSED,
            IntegrationStatus.ERROR,
          ],
        },
      },
    }),
    prisma.baaRecord.count({
      where: {
        organizationId: org.id,
        status: BaaStatus.SIGNED,
      },
    }),
    prisma.riskAssessment.findFirst({
      where: {
        organizationId: org.id,
        status: { not: PolicyStatus.ARCHIVED },
      },
      select: { id: true },
    }),
  ]);

  const safeguardSummaries = buildSafeguardBucketSummaries(
    orgControls.map((row) => ({
      score: row.score,
      category: row.frameworkControl.category,
      ownerId: row.ownerId,
      evidence: row.evidence,
      status: row.status,
    })),
    { approvedPolicyCount: approvedPolicies }
  );

  const controlSnapshots: ControlScoreSnapshot[] = orgControls.map((row) => ({
    controlRef: row.frameworkControl.controlRef,
    ownerId: row.ownerId,
    evidence: row.evidence,
    status: row.status,
  }));

  const nextSteps = buildDashboardNextSteps({
    controls: controlSnapshots,
    approvedPolicyCount: approvedPolicies,
    unapprovedPolicyCount: unapprovedPolicies,
    hasConnectedIntegration: connectedIntegrations > 0,
    hasSignedBaa: signedBaas > 0,
    hasRiskAssessment: Boolean(latestRiskAssessment),
  });

  const scoreBreakdown = buildReadinessScoreBreakdown(
    controlSnapshots,
    approvedPolicies
  );

  const statusRollup = buildControlStatusRollup(
    orgControls.map((row) => row.status)
  );

  const controlsWithEvidence = orgControls.filter(
    (row) => row.evidence.length > 0
  ).length;
  const controlCount = orgControls.length;
  const withOwner = orgControls.filter((row) => Boolean(row.ownerId)).length;

  const policiesValue = `${approvedPolicies}/${HIPAA_POLICY_TARGET}`;
  const policiesHint =
    approvedPolicies >= HIPAA_POLICY_TARGET
      ? "Target met"
      : `${HIPAA_POLICY_TARGET - approvedPolicies} still needed`;

  return (
    <main className="flex w-full flex-col px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8 lg:px-8">
      <div className="w-full space-y-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="space-y-0">
          <DashboardFrameworkTabs active="hipaa" />
          <HipaaWorkspaceNav />
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
          <DashboardReadinessLive
            initialScore={readinessScore}
            initialBreakdown={scoreBreakdown}
          />
          <NextUpSection steps={nextSteps} />
        </div>

        <ControlStatusRollupSection initialRollup={statusRollup} />

        <SafeguardBreakdownSection summaries={safeguardSummaries} />

        <DashboardMetricStrip
          metrics={[
            {
              title: "Evidence coverage",
              value: `${controlsWithEvidence}/${controlCount || 0}`,
              hint:
                org._count.evidence === 0
                  ? "No evidence items yet"
                  : `${org._count.evidence} evidence item${org._count.evidence === 1 ? "" : "s"} total`,
              href: "/evidence",
            },
            {
              title: "Policies approved",
              value: policiesValue,
              hint: policiesHint,
              href: "/hipaa/policies",
            },
            {
              title: "Controls implemented",
              value: `${statusRollup.implemented}/${statusRollup.total || 0}`,
              hint:
                statusRollup.inProgress > 0
                  ? `${statusRollup.inProgress} in progress · ${withOwner} with owners`
                  : `${withOwner} with owners assigned`,
              href: "/hipaa/controls",
            },
            {
              title: "BAAs signed",
              value: `${signedBaas}/${org._count.baaRecords || 0}`,
              hint:
                org._count.baaRecords === 0
                  ? "Add vendors with PHI access"
                  : signedBaas === org._count.baaRecords
                    ? "All tracked BAAs are signed"
                    : `${org._count.baaRecords - signedBaas} still need a signature`,
              href: "/hipaa/baa-tracker",
            },
          ]}
        />
      </div>
    </main>
  );
}
