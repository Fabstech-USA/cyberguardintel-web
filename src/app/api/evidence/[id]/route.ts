import { NextResponse } from "next/server";

import { getEvidenceById } from "@/lib/evidence-queries";
import { withTenant, type TenantContext } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteCtx): Promise<Response> {
  const { id } = await params;

  return withTenant(async (_request, ctx: TenantContext) => {
    const evidence = await getEvidenceById({
      organizationId: ctx.organizationId,
      evidenceId: id,
    });

    if (!evidence) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ evidence });
  })(req);
}
