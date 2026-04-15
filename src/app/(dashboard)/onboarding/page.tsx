import { auth } from "@clerk/nextjs/server";
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

    if (org) {
      return (
        <main className="flex w-full flex-1 flex-col items-center justify-center p-8">
          <OnboardingWizard initialStep={org.onboardingStep ?? 0} />
        </main>
      );
    }
  }

  return (
    <main className="flex w-full flex-1 flex-col items-center justify-center p-8">
      <OnboardingWizard initialStep={0} />
    </main>
  );
}
