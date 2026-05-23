import { NextResponse } from "next/server";
import { canManageHipaaPolicies } from "@/lib/hipaa-policy-access";
import {
  PolicyRegenerateError,
  regenerateHipaaPolicyById,
} from "@/lib/hipaa-policy-regenerate";
import { withTenant, type TenantContext } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(
  req: Request,
  { params }: RouteCtx
): Promise<Response> {
  const { id } = await params;

  return withTenant(async (_r, ctx: TenantContext) => {
    if (!canManageHipaaPolicies(ctx.orgRole)) {
      return NextResponse.json(
        { error: "Only owners or admins can reject and regenerate policies." },
        { status: 403 }
      );
    }

    try {
      const policy = await regenerateHipaaPolicyById({
        organizationId: ctx.organizationId,
        clerkUserId: ctx.clerkUserId,
        policyId: id,
        logRejection: true,
      });

      return NextResponse.json(policy, { status: 200 });
    } catch (err) {
      if (err instanceof PolicyRegenerateError) {
        if (err.code === "NOT_FOUND" || err.code === "ORG_NOT_FOUND") {
          return NextResponse.json({ error: err.message }, { status: 404 });
        }
        if (err.code === "INVALID_STATUS" || err.code === "NOT_AI_DRAFT") {
          return NextResponse.json({ error: err.message }, { status: 409 });
        }
        if (err.code === "AI_UNAVAILABLE") {
          return NextResponse.json({ error: err.message }, { status: 502 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
      throw err;
    }
  })(req);
}
