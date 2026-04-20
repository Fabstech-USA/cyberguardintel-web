import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { prisma } from "@/lib/prisma";
import { formatPlanChipText } from "@/lib/plan-display";

export default async function Layout({
  children,
}: {
  children: ReactNode;
}): Promise<React.JSX.Element> {
  const { orgId } = await auth();

  let planChipText: string | null = null;
  let orgName: string | null = null;
  if (orgId) {
    const org = await prisma.organization.findUnique({
      where: { clerkOrgId: orgId },
      select: { name: true, plan: true, trialEndsAt: true },
    });
    if (org) {
      orgName = org.name;
      planChipText = formatPlanChipText(org.plan, org.trialEndsAt);
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <DashboardHeader orgName={orgName} planChipText={planChipText} />
      <div className="flex min-h-0 flex-1 flex-col justify-start bg-muted/30">
        {children}
      </div>
    </div>
  );
}
