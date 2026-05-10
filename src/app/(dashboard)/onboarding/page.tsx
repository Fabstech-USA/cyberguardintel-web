import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { recommendedPlanFor } from "@/lib/plans";
import { userShouldRunOrgOnboardingWizard } from "@/lib/clerk-org-onboarding";
import { ensureOrganizationSyncedFromClerk } from "@/lib/clerk-webhook-sync";

// Match the wizard's internal indices. Users landing on /onboarding with no
// org at all start at Plan (0); users resuming from a persisted onboardingStep
// jump directly to whichever form step they got to. Plan/Welcome are
// client-only so they can't appear as resume targets — a persisted step is
// always >= STEP_HIPAA_ROLE.
const STEP_PLAN = 0;

export default async function OnboardingPage(): Promise<React.JSX.Element> {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (orgId) {
    let org = await prisma.organization.findUnique({
      where: { clerkOrgId: orgId },
      select: { onboardingStep: true, employeeCount: true },
    });

    if (!org) {
      await ensureOrganizationSyncedFromClerk(orgId);
      org = await prisma.organization.findUnique({
        where: { clerkOrgId: orgId },
        select: { onboardingStep: true, employeeCount: true },
      });
    }

    if (!org) {
      redirect("/post-auth");
    }

    if (org.onboardingStep === null) {
      redirect("/dashboard");
    }

    const runOrgWizard = await userShouldRunOrgOnboardingWizard(userId, orgId);
    if (!runOrgWizard) {
      redirect("/dashboard");
    }

    return (
      <main className="flex w-full flex-1 flex-col items-center justify-center p-8">
        <OnboardingWizard
          initialStep={org.onboardingStep ?? STEP_PLAN}
          recommendedPlan={recommendedPlanFor(org.employeeCount)}
        />
      </main>
    );
  }

  // No active org on the session. If the user is already a member of one,
  // bounce through /post-auth so it can activate the membership. Otherwise,
  // start a fresh wizard at Plan — the org gets created atomically at
  // Step 1/4 (Org details) once plan + org info are both collected.
  const clerk = await clerkClient();
  const memberships = await clerk.users.getOrganizationMembershipList({
    userId,
  });

  if (memberships.totalCount > 0) {
    redirect("/post-auth");
  }

  return (
    <main className="flex w-full flex-1 flex-col items-center justify-center p-8">
      <OnboardingWizard initialStep={STEP_PLAN} />
    </main>
  );
}
