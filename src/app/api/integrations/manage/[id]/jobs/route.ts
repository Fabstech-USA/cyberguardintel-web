import { NextResponse } from "next/server";

import { listIntegrationJobs } from "@/lib/integration-detail-queries";
import { prisma } from "@/lib/prisma";
import { withTenant, type TenantContext } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteCtx): Promise<Response> {
  const { id } = await params;

  return withTenant(async (_request, ctx: TenantContext) => {
    const integration = await prisma.integration.findFirst({
      where: { id, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!integration) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const jobs = await listIntegrationJobs({
      organizationId: ctx.organizationId,
      integrationId: id,
    });

    return NextResponse.json({ jobs });
  })(req);
}
