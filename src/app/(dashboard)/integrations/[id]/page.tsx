import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { IntegrationDetailClient } from "@/components/integrations/detail/IntegrationDetailClient";
import {
  getIntegrationDetailDto,
  getIntegrationOverview,
  listIntegrationJobs,
  listRecentIntegrationEvidence,
} from "@/lib/integration-detail-queries";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function IntegrationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  const organization = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    select: { id: true },
  });
  if (!organization) {
    redirect("/onboarding");
  }

  const [integration, overview, jobs, evidenceResult] = await Promise.all([
    getIntegrationDetailDto({
      organizationId: organization.id,
      integrationId: id,
    }),
    getIntegrationOverview({
      organizationId: organization.id,
      integrationId: id,
    }),
    listIntegrationJobs({
      organizationId: organization.id,
      integrationId: id,
    }),
    listRecentIntegrationEvidence({
      organizationId: organization.id,
      integrationId: id,
      limit: 7,
    }),
  ]);

  if (!integration || !overview) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-muted-foreground">Loading…</div>
      }
    >
      <IntegrationDetailClient
        initialIntegration={integration}
        initialOverview={overview}
        initialJobs={jobs}
        initialEvidence={evidenceResult.items}
      />
    </Suspense>
  );
}
