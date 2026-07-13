import { NextResponse } from "next/server";

import { getFrameworkLimit } from "@/lib/framework-limits";
import { countOrgFrameworks } from "@/lib/framework-limits-server";
import { getIntegrationLimit } from "@/lib/integration-limits";
import { countConnectedIntegrations } from "@/lib/integration-limits-server";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";

export const GET = withTenant(async (_req, ctx) => {
  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      plan: true,
      planPeriod: true,
      trialEndsAt: true,
      stripeCustomerId: true,
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const [integrationsUsed, frameworksUsed] = await Promise.all([
    countConnectedIntegrations(ctx.organizationId),
    countOrgFrameworks(ctx.organizationId),
  ]);

  return NextResponse.json({
    plan: org.plan,
    planPeriod: org.planPeriod,
    trialEndsAt: org.trialEndsAt,
    stripeCustomerId: org.stripeCustomerId,
    integrationsUsed,
    integrationsLimit: getIntegrationLimit(org.plan),
    frameworksUsed,
    frameworksLimit: getFrameworkLimit(org.plan),
  });
});
