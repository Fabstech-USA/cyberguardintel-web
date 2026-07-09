import { NextResponse } from "next/server";

import {
  listEvidenceControlRefs,
  listOrgControlsForEvidence,
} from "@/lib/evidence-queries";
import { withTenant } from "@/lib/tenant";

export const GET = withTenant(async (_req, ctx) => {
  const [controlRefs, orgControls] = await Promise.all([
    listEvidenceControlRefs(ctx.organizationId),
    listOrgControlsForEvidence(ctx.organizationId),
  ]);
  return NextResponse.json({ controlRefs, orgControls });
});
