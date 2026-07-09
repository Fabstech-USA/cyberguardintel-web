import { NextResponse } from "next/server";

import { getEvidenceStats } from "@/lib/evidence-queries";
import { withTenant } from "@/lib/tenant";

export const GET = withTenant(async (_req, ctx) => {
  const stats = await getEvidenceStats(ctx.organizationId);
  return NextResponse.json(stats);
});
