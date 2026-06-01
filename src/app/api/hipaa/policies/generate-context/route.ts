import { NextResponse } from "next/server";

import { canManageHipaaPolicies } from "@/lib/hipaa-policy-access";
import { loadPolicyGenerationFormContext } from "@/lib/ai-policy-generation";
import { withTenant } from "@/lib/tenant";

/** Prefill data for single-policy AI generation dialog. */
export const GET = withTenant(async (_req, ctx): Promise<Response> => {
  if (!canManageHipaaPolicies(ctx.orgRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const loaded = await loadPolicyGenerationFormContext(ctx.organizationId);
  if (!loaded) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  return NextResponse.json(loaded);
});
