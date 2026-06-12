import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { IntegrationsClient } from "@/components/integrations/IntegrationsClient";
import { toIntegrationPublicDto } from "@/lib/integration-api";
import { getIntegrationLimit } from "@/lib/integration-limits";
import { prisma } from "@/lib/prisma";

export default async function IntegrationsPage() {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  const organization = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    select: { id: true, plan: true },
  });

  if (!organization) {
    redirect("/onboarding");
  }

  const integrations = await prisma.integration.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Suspense fallback={<div className="p-8 text-sm text-muted-foreground">Loading…</div>}>
      <IntegrationsClient
        connectedIntegrations={integrations.map(toIntegrationPublicDto)}
        organizationPlan={organization.plan}
        planLimit={getIntegrationLimit(organization.plan)}
      />
    </Suspense>
  );
}
