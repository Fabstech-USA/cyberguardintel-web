import { NextResponse } from "next/server";
import { OrgRole, PolicyStatus, Prisma } from "@/generated/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { withTenant, type TenantContext } from "@/lib/tenant";

const APPROVER_ROLES: OrgRole[] = [OrgRole.OWNER, OrgRole.ADMIN];

export function canApproveRisk(role: string): boolean {
  return APPROVER_ROLES.includes(role as OrgRole);
}

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteCtx): Promise<Response> {
  const { id } = await params;
  return withTenant(async (_r, ctx: TenantContext) => {
    if (!canApproveRisk(ctx.orgRole)) {
      return NextResponse.json(
        { error: "Only owners or admins can approve a risk assessment." },
        { status: 403 }
      );
    }

    try {
      const updated = await prisma.riskAssessment.update({
        where: {
          id,
          organizationId: ctx.organizationId,
          status: PolicyStatus.DRAFT,
        },
        data: {
          status: PolicyStatus.APPROVED,
          approvedById: ctx.clerkUserId,
          approvedAt: new Date(),
        },
      });

      writeAuditLog({
        organizationId: ctx.organizationId,
        actorId: ctx.clerkUserId,
        action: "risk_assessment.approved",
        resourceType: "RiskAssessment",
        resourceId: updated.id,
        metadata: {
          version: updated.version,
          riskLevel: updated.riskLevel,
        },
      });

      return NextResponse.json(updated, { status: 200 });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        // Either: row doesn't exist for this org, or it's already approved/archived.
        return NextResponse.json(
          {
            error:
              "Assessment not found or no longer in DRAFT status. Refresh and try again.",
          },
          { status: 409 }
        );
      }
      throw err;
    }
  })(req);
}
