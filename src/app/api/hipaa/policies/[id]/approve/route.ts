import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";
import { canApproveHipaaPolicies } from "@/lib/hipaa-policy-access";
import {
  approveHipaaPolicy,
  PolicyApproveError,
} from "@/lib/hipaa-policy-approve";
import { withTenant, type TenantContext } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(
  req: Request,
  { params }: RouteCtx
): Promise<Response> {
  const { id } = await params;

  return withTenant(async (_r, ctx: TenantContext) => {
    if (!canApproveHipaaPolicies(ctx.orgRole)) {
      return NextResponse.json(
        { error: "Only owners or admins can approve policies." },
        { status: 403 }
      );
    }

    try {
      const result = await approveHipaaPolicy({
        organizationId: ctx.organizationId,
        clerkUserId: ctx.clerkUserId,
        policyId: id,
      });

      return NextResponse.json(result.policy, { status: 200 });
    } catch (err) {
      if (err instanceof PolicyApproveError) {
        if (err.code === "NOT_FOUND") {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json({ error: err.message }, { status: 409 });
      }
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return NextResponse.json(
          { error: "Policy not found or was updated elsewhere." },
          { status: 409 }
        );
      }
      throw err;
    }
  })(req);
}
