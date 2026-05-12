import { NextResponse } from "next/server";

import {
  BaaUpdateSchema,
  canMutateBaa,
  normalizeBaaWriteInput,
} from "@/lib/baa";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { withTenant, type TenantContext } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ id: string }> };

async function loadBaaForOrg(
  organizationId: string,
  id: string
): Promise<{ id: string } | null> {
  return prisma.baaRecord.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
}

export async function PATCH(req: Request, { params }: RouteCtx): Promise<Response> {
  const { id } = await params;
  return withTenant(async (request, ctx: TenantContext) => {
    if (!canMutateBaa(ctx.orgRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await loadBaaForOrg(ctx.organizationId, id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = BaaUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = normalizeBaaWriteInput(parsed.data);
    const updated = await prisma.baaRecord.update({
      where: { id },
      data: {
        ...(data.vendorName !== undefined ? { vendorName: data.vendorName } : {}),
        ...(data.vendorEmail !== undefined ? { vendorEmail: data.vendorEmail } : {}),
        ...(data.services !== undefined ? { services: data.services } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.signedAt !== undefined ? { signedAt: data.signedAt } : {}),
        ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt } : {}),
        ...(data.documentS3Key !== undefined
          ? { documentS3Key: data.documentS3Key }
          : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });

    writeAuditLog({
      organizationId: ctx.organizationId,
      actorId: ctx.clerkUserId,
      action: "baa.updated",
      resourceType: "BaaRecord",
      resourceId: updated.id,
      metadata: { status: updated.status, vendorName: updated.vendorName },
    });

    return NextResponse.json(updated);
  })(req);
}

export async function DELETE(req: Request, { params }: RouteCtx): Promise<Response> {
  const { id } = await params;
  return withTenant(async (_request, ctx: TenantContext) => {
    if (!canMutateBaa(ctx.orgRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await loadBaaForOrg(ctx.organizationId, id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.baaRecord.delete({ where: { id } });

    writeAuditLog({
      organizationId: ctx.organizationId,
      actorId: ctx.clerkUserId,
      action: "baa.deleted",
      resourceType: "BaaRecord",
      resourceId: id,
    });

    return NextResponse.json({ ok: true });
  })(req);
}
