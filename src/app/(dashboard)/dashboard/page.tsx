import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { FrameworkSlug, PolicyStatus } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { userShouldRunOrgOnboardingWizard } from "@/lib/clerk-org-onboarding";
import { ensureOrganizationSyncedFromClerk } from "@/lib/clerk-webhook-sync";
import { DASHBOARD_NEXT_STEPS } from "@/lib/dashboard-next-steps";
import { aggregateSafeguardScores } from "@/lib/dashboard-safeguards";
import { DashboardFrameworkTabs } from "@/components/dashboard/DashboardFrameworkTabs";
import { HipaaWorkspaceNav } from "@/components/dashboard/HipaaWorkspaceNav";
import { DashboardMetricStrip } from "@/components/dashboard/DashboardMetricStrip";
import { NextUpSection } from "@/components/dashboard/NextUpSection";
import { ReadinessSection } from "@/components/dashboard/ReadinessSection";
import { SafeguardBreakdownSection } from "@/components/dashboard/SafeguardBreakdownSection";

/** MVP HIPAA policy catalog size — shown as approved / target on the dashboard. */
const HIPAA_POLICY_TARGET = 12;

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

  const [orgControls, approvedPolicies] = await Promise.all([
    prisma.orgControl.findMany({
      where: {
        organizationId: org.id,
        frameworkControl: {
          framework: { slug: FrameworkSlug.HIPAA },
        },
      },
      select: {
        score: true,
        frameworkControl: { select: { category: true } },
      },
    }),
    prisma.policy.count({
      where: {
        organizationId: org.id,
        frameworkSlug: FrameworkSlug.HIPAA,
        status: PolicyStatus.APPROVED,
      },
    }),
  ]);

  const safeguardScores = aggregateSafeguardScores(
    orgControls.map((row) => ({
      score: row.score,
      category: row.frameworkControl.category,
    }))
  );

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
          <ReadinessSection score={readinessScore} />
          <NextUpSection steps={DASHBOARD_NEXT_STEPS} />
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
