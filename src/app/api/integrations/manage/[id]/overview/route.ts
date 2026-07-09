import { NextResponse } from "next/server";

import { getIntegrationOverview } from "@/lib/integration-detail-queries";
import { withTenant, type TenantContext } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteCtx): Promise<Response> {
  const { id } = await params;

  return withTenant(async (_request, ctx: TenantContext) => {
    const overview = await getIntegrationOverview({
      organizationId: ctx.organizationId,
      integrationId: id,
    });
    if (!overview) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ overview });
  })(req);
}
