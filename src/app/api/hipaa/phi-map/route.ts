import { NextResponse } from "next/server";
import { loadPhiMapBundle } from "@/lib/phi-map-server";
import { withTenant } from "@/lib/tenant";

export const GET = withTenant(async (_req, ctx) => {
  const bundle = await loadPhiMapBundle(ctx.organizationId);
  return NextResponse.json(bundle);
});
