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
import { buildDashboardNextSteps } from "@/lib/dashboard-next-steps";
import { aggregateSafeguardScores } from "@/lib/dashboard-safeguards";
import { DashboardFrameworkTabs } from "@/components/dashboard/DashboardFrameworkTabs";
import { HipaaWorkspaceNav } from "@/components/dashboard/HipaaWorkspaceNav";
import { DashboardMetricStrip } from "@/components/dashboard/DashboardMetricStrip";
import { NextUpSection } from "@/components/dashboard/NextUpSection";
import { DashboardReadinessLive } from "@/components/dashboard/DashboardReadinessLive";
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

  const safeguardScores = aggregateSafeguardScores(
    orgControls.map((row) => ({
      score: row.score,
      category: row.frameworkControl.category,
    }))
  );

  const controlSnapshots: ControlScoreSnapshot[] = orgControls.map((row) => ({
    controlRef: row.frameworkControl.controlRef,
    ownerId: row.ownerId,
    evidence: row.evidence,
  }));

  const nextSteps = buildDashboardNextSteps({
    controls: controlSnapshots,
    approvedPolicyCount: approvedPolicies,
    unapprovedPolicyCount: unapprovedPolicies,
    hasConnectedIntegration: connectedIntegrations > 0,
    hasSignedBaa: signedBaas > 0,
    hasRiskAssessment: Boolean(latestRiskAssessment),
  });

  const policiesValue = `${approvedPolicies}/${HIPAA_POLICY_TARGET}`;

  const policiesHint =
    approvedPolicies >= HIPAA_POLICY_TARGET ? "Up to date" : "Needs review";

  return (
    <main className="flex w-full flex-col px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8 lg:px-8">
      <div className="w-full space-y-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="space-y-0">
          <DashboardFrameworkTabs active="hipaa" />
          <HipaaWorkspaceNav />
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <DashboardReadinessLive initialScore={readinessScore} />
          <NextUpSection steps={nextSteps} />
        </div>

        <SafeguardBreakdownSection scores={safeguardScores} />

        <DashboardMetricStrip
          metrics={[
            {
              title: "Evidence items",
              value: String(org._count.evidence),
              hint: "Auto-collected",
            },
            {
              title: "Policies approved",
              value: policiesValue,
              hint: policiesHint,
            },
            {
              title: "BAAs tracked",
              value: String(org._count.baaRecords),
              hint: "Add vendors",
            },
            {
              title: "Training records",
              value: String(org._count.trainingRecords),
              hint: "Annual cycle",
            },
          ]}
        />
      </div>
    </main>
  );
}
