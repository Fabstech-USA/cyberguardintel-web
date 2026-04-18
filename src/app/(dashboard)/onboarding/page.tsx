import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage(): Promise<React.JSX.Element> {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (orgId) {
    const org = await prisma.organization.findUnique({
      where: { clerkOrgId: orgId },
      select: { onboardingStep: true },
    });

    if (org && org.onboardingStep === null) {
      redirect("/dashboard");
    }

    // A Clerk org exists on the session but no matching Prisma row (e.g. an
    // earlier onboarding attempt bailed). Let the wizard re-drive setup.
    return (
      <main className="flex w-full flex-1 flex-col items-center justify-center p-8">
        <OnboardingWizard initialStep={org?.onboardingStep ?? 0} />
      </main>
    );
  }

  // No active org on the session. If the user is already a member of one,
  // bounce through /post-auth so it can activate the membership. Otherwise,
  // kick off a fresh onboarding wizard — the first step will create both the
  // Clerk org and the Prisma row.
  const clerk = await clerkClient();
  const memberships = await clerk.users.getOrganizationMembershipList({
    userId,
  });

  if (memberships.totalCount > 0) {
    redirect("/post-auth");
  }

  return (
    <main className="flex w-full flex-1 flex-col items-center justify-center p-8">
      <OnboardingWizard initialStep={0} />
    </main>
  );
}
