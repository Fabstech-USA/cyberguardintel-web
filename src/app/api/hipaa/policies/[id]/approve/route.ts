import { NextResponse } from "next/server";
import { addYears } from "date-fns";
import { FrameworkSlug, PolicyStatus, Prisma } from "@/generated/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { canApproveHipaaPolicies } from "@/lib/hipaa-policy-access";
import { canApprovePolicyStatus } from "@/lib/hipaa-policy-status";
import { prisma } from "@/lib/prisma";
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

    const existing = await prisma.policy.findFirst({
      where: {
        id,
        organizationId: ctx.organizationId,
        frameworkSlug: FrameworkSlug.HIPAA,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!canApprovePolicyStatus(existing.status)) {
      return NextResponse.json(
        {
          error:
            "Only draft or under-review policies can be approved. Change status first if needed.",
        },
        { status: 409 }
      );
    }

    const now = new Date();

    try {
      const updated = await prisma.policy.update({
        where: { id: existing.id },
        data: {
          status: PolicyStatus.APPROVED,
          approvedById: ctx.clerkUserId,
          approvedAt: now,
          effectiveDate: now,
          reviewDate: addYears(now, 1),
        },
      });

      writeAuditLog({
        organizationId: ctx.organizationId,
        actorId: ctx.clerkUserId,
        action: "policy.approved",
        resourceType: "Policy",
        resourceId: updated.id,
        metadata: {
          type: updated.type,
          version: updated.version,
        },
      });

      return NextResponse.json(updated, { status: 200 });
    } catch (err) {
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
