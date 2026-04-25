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
  const { orgId } = await auth();

  let planChipText: string | null = null;
  if (orgId) {
    const org = await prisma.organization.findUnique({
      where: { clerkOrgId: orgId },
      select: { plan: true, trialEndsAt: true },
    });
    if (org) {
      planChipText = formatPlanChipText(org.plan, org.trialEndsAt);
    }
  }

  return <DashboardShell planChipText={planChipText}>{children}</DashboardShell>;
}
