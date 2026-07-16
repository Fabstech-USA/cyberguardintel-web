import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { prisma } from "@/lib/prisma";
import { formatPlanChipText } from "@/lib/plan-display";

export default async function Layout({
  children,
}: {
  children: ReactNode;
}): Promise<React.JSX.Element> {
  const { userId, orgId } = await auth();

  let planChipText: string | null = null;
  let productTourCompleted = true;
  let orgOnboardingComplete = false;

  if (orgId) {
    const org = await prisma.organization.findUnique({
      where: { clerkOrgId: orgId },
      select: {
        id: true,
        plan: true,
        trialEndsAt: true,
        onboardingStep: true,
      },
    });
    if (org) {
      planChipText = formatPlanChipText(org.plan, org.trialEndsAt);
      orgOnboardingComplete = org.onboardingStep === null;

      if (userId) {
        const member = await prisma.orgMember.findUnique({
          where: {
            clerkUserId_organizationId: {
              clerkUserId: userId,
              organizationId: org.id,
            },
          },
          select: { productTourCompletedAt: true },
        });
        // No membership row yet → don't auto-start; treat as completed
        productTourCompleted = member
          ? member.productTourCompletedAt !== null
          : true;
      }
    }
  }

  return (
    <DashboardShell
      planChipText={planChipText}
      productTourCompleted={productTourCompleted}
      orgOnboardingComplete={orgOnboardingComplete}
    >
      {children}
    </DashboardShell>
  );
}
