import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/audit-log";
import { encryptCredentials } from "@/lib/crypto";
import { toIntegrationPublicDto } from "@/lib/integration-api";
import { getCatalogEntry } from "@/lib/integration-catalog";
import { IntegrationLimitError } from "@/lib/integration-limits";
import { assertIntegrationCapacity } from "@/lib/integration-limits-server";
import { validateConnectIntegrationBody } from "@/lib/integration-route-validation";
import { prisma } from "@/lib/prisma";
import { withTenant, type TenantContext } from "@/lib/tenant";

async function getOrganizationPlan(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true },
  });
}

export const GET = withTenant(async (_req, ctx: TenantContext) => {
  const integrations = await prisma.integration.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    integrations: integrations.map(toIntegrationPublicDto),
  });
});

export const POST = withTenant(async (req, ctx: TenantContext) => {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validated = validateConnectIntegrationBody(body);
  if (!validated.success) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const { type, displayName, credentials } = validated.data;
  const catalogEntry = getCatalogEntry(type);
  if (!catalogEntry) {
    return NextResponse.json({ error: "Unknown integration type" }, { status: 400 });
  }

  const org = await getOrganizationPlan(ctx.organizationId);
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  try {
    await assertIntegrationCapacity(ctx.organizationId, org.plan, {
      excludeType: type,
    });
  } catch (error) {
    if (error instanceof IntegrationLimitError) {
      return NextResponse.json(
        {
          error: error.code,
          used: error.used,
          limit: error.limit,
          plan: error.plan,
        },
        { status: 403 }
      );
    }
    throw error;
  }

  const encryptedCreds = encryptCredentials(JSON.stringify(credentials));
  const integration = await prisma.integration.upsert({
    where: {
      organizationId_type: {
        organizationId: ctx.organizationId,
        type,
      },
    },
    create: {
      organizationId: ctx.organizationId,
      type,
      displayName: displayName ?? catalogEntry.name,
      encryptedCreds,
      status: "ACTIVE",
      errorMessage: null,
    },
    update: {
      displayName: displayName ?? catalogEntry.name,
      encryptedCreds,
      status: "ACTIVE",
      errorMessage: null,
    },
  });

  writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.clerkUserId,
    action: "integration.connected",
    resourceType: "Integration",
    resourceId: integration.id,
    metadata: { type },
  });

  return NextResponse.json(toIntegrationPublicDto(integration), { status: 201 });
});
