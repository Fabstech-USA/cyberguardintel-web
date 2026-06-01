import { NextResponse } from "next/server";

import { BaaDraftSaveSchema, canMutateBaa } from "@/lib/baa";
import { syncBaaAndRecalculateScore } from "@/lib/baa-evidence-sync";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { withTenant, type TenantContext } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: RouteCtx): Promise<Response> {
  const { id } = await params;
  return withTenant(async (request, ctx: TenantContext) => {
    if (!canMutateBaa(ctx.orgRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.baaRecord.findFirst({
      where: { id, organizationId: ctx.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = BaaDraftSaveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const updated = await prisma.baaRecord.update({
      where: { id },
      data: {
        ...(data.vendorName !== undefined ? { vendorName: data.vendorName } : {}),
        ...(data.vendorEmail !== undefined ? { vendorEmail: data.vendorEmail } : {}),
        ...(data.services !== undefined ? { services: data.services } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        draftTitle: data.draftTitle,
        draftMarkdown: data.draftMarkdown,
        draftReviewStatus:
          data.draftReviewStatus ?? existing.draftReviewStatus,
        draftUpdatedAt: new Date(),
      },
    });

    writeAuditLog({
      organizationId: ctx.organizationId,
      actorId: ctx.clerkUserId,
      action: "baa.draft_saved",
      resourceType: "BaaRecord",
      resourceId: updated.id,
      metadata: {
        vendorName: updated.vendorName,
        draftReviewStatus: updated.draftReviewStatus,
      },
    });

    await syncBaaAndRecalculateScore(ctx.organizationId, updated);

    return NextResponse.json(updated);
  })(req);
}
