import { NextResponse } from "next/server";
import { z } from "zod";
import { FrameworkSlug, PolicyStatus, Prisma } from "@/generated/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { canManageHipaaPolicies } from "@/lib/hipaa-policy-access";
import {
  canTransitionPolicyStatus,
  getAllowedPolicyTransitions,
} from "@/lib/hipaa-policy-status";
import { triggerHipaaScoreRecalculation } from "@/lib/hipaa-scoring";
import { updateHipaaPolicyContent } from "@/lib/hipaa-policy-persist";
import { prisma } from "@/lib/prisma";
import { withTenant, type TenantContext } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ id: string }> };

const EDITABLE_STATUSES: PolicyStatus[] = [
  PolicyStatus.DRAFT,
  PolicyStatus.UNDER_REVIEW,
];

const PatchStatusSchema = z.object({
  status: z.nativeEnum(PolicyStatus),
});

const PatchContentSchema = z.object({
  title: z.string().trim().min(1).max(500),
  content: z.string().min(10),
});

export async function GET(
  req: Request,
  routeCtx: RouteCtx
): Promise<Response> {
  const { id } = await routeCtx.params;

  return withTenant(async (_r, ctx) => {
    const policy = await prisma.policy.findFirst({
      where: {
        id,
        organizationId: ctx.organizationId,
        frameworkSlug: FrameworkSlug.HIPAA,
      },
    });

    if (!policy) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const allowedTransitions = getAllowedPolicyTransitions(policy.status);

    return NextResponse.json({
      policy,
      allowedTransitions,
      canManagePolicies: canManageHipaaPolicies(ctx.orgRole),
    });
  })(req);
}

export async function PATCH(
  req: Request,
  routeCtx: RouteCtx
): Promise<Response> {
  const { id } = await routeCtx.params;

  return withTenant(async (request, ctx: TenantContext) => {
    if (!canManageHipaaPolicies(ctx.orgRole)) {
      return NextResponse.json(
        { error: "Only owners or admins can change policy status." },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = {};
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

    const contentParsed = PatchContentSchema.safeParse(body);
    if (contentParsed.success) {
      if (!EDITABLE_STATUSES.includes(existing.status)) {
        return NextResponse.json(
          {
            error:
              "Approved or archived policies cannot be edited. Move back to draft or under review first.",
          },
          { status: 409 }
        );
      }
      try {
        const updated = await updateHipaaPolicyContent({
          organizationId: ctx.organizationId,
          clerkUserId: ctx.clerkUserId,
          policyId: existing.id,
          title: contentParsed.data.title,
          content: contentParsed.data.content,
        });
        return NextResponse.json(updated);
      } catch {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    const parsed = PatchStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const nextStatus = parsed.data.status;

    if (nextStatus === PolicyStatus.APPROVED) {
      return NextResponse.json(
        {
          error:
            "Use POST /api/hipaa/policies/[id]/approve to approve a policy.",
        },
        { status: 400 }
      );
    }

    if (!canTransitionPolicyStatus(existing.status, nextStatus)) {
      return NextResponse.json(
        {
          error: `Cannot move from ${existing.status} to ${nextStatus}.`,
          allowedTransitions: getAllowedPolicyTransitions(existing.status),
        },
        { status: 409 }
      );
    }

    if (existing.status === nextStatus) {
      return NextResponse.json(existing);
    }

    const data: Prisma.PolicyUpdateInput = { status: nextStatus };

    if (
      nextStatus === PolicyStatus.DRAFT ||
      existing.status === PolicyStatus.APPROVED
    ) {
      data.approvedById = null;
      data.approvedAt = null;
      data.effectiveDate = null;
      data.reviewDate = null;
    }

    try {
      const updated = await prisma.policy.update({
        where: { id: existing.id },
        data,
      });

      const action =
        nextStatus === PolicyStatus.ARCHIVED
          ? "policy.archived"
          : "policy.status_changed";

      writeAuditLog({
        organizationId: ctx.organizationId,
        actorId: ctx.clerkUserId,
        action,
        resourceType: "Policy",
        resourceId: updated.id,
        metadata: {
          type: updated.type,
          fromStatus: existing.status,
          toStatus: nextStatus,
          version: updated.version,
        },
      });

      if (existing.status === PolicyStatus.APPROVED) {
        await triggerHipaaScoreRecalculation(ctx.organizationId);
      }

      return NextResponse.json(updated);
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
