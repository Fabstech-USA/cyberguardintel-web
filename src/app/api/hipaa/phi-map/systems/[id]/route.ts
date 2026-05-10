import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit-log";
import { PhiSystemUpdateSchema, canMutatePhiMap } from "@/lib/phi-map";
import { prisma } from "@/lib/prisma";
import { withTenant, type TenantContext } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ id: string }> };

async function loadSystemForOrg(
  organizationId: string,
  id: string
): Promise<{ id: string } | null> {
  return prisma.phiSystem.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
}

export async function PATCH(req: Request, { params }: RouteCtx): Promise<Response> {
  const { id } = await params;
  return withTenant(async (request, ctx: TenantContext) => {
    if (!canMutatePhiMap(ctx.orgRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await loadSystemForOrg(ctx.organizationId, id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body: unknown = await request.json();
    const parsed = PhiSystemUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const d = parsed.data;
    if (d.baaRecordId) {
      const baa = await prisma.baaRecord.findFirst({
        where: { id: d.baaRecordId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!baa) {
        return NextResponse.json({ error: "BAA record not found" }, { status: 400 });
      }
    }

    const updated = await prisma.phiSystem.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.systemType !== undefined ? { systemType: d.systemType } : {}),
        ...(d.description !== undefined
          ? { description: d.description ?? null }
          : {}),
        ...(d.containsPhi !== undefined ? { containsPhi: d.containsPhi } : {}),
        ...(d.phiTypes !== undefined ? { phiTypes: d.phiTypes } : {}),
        ...(d.accessControls !== undefined
          ? { accessControls: d.accessControls ?? null }
          : {}),
        ...(d.encryptionAtRest !== undefined
          ? { encryptionAtRest: d.encryptionAtRest }
          : {}),
        ...(d.encryptionInTransit !== undefined
          ? { encryptionInTransit: d.encryptionInTransit }
          : {}),
        ...(d.phiCreates !== undefined ? { phiCreates: d.phiCreates } : {}),
        ...(d.phiTransmits !== undefined ? { phiTransmits: d.phiTransmits } : {}),
        ...(d.phiStores !== undefined ? { phiStores: d.phiStores } : {}),
        ...(d.phiDestroys !== undefined ? { phiDestroys: d.phiDestroys } : {}),
        ...(d.baaRecordId !== undefined
          ? { baaRecordId: d.baaRecordId ?? null }
          : {}),
      },
    });

    writeAuditLog({
      organizationId: ctx.organizationId,
      actorId: ctx.clerkUserId,
      action: "phi_map.system_updated",
      resourceType: "PhiSystem",
      resourceId: id,
    });

    return NextResponse.json(updated);
  })(req);
}

export async function DELETE(req: Request, { params }: RouteCtx): Promise<Response> {
  const { id } = await params;
  return withTenant(async (_request, ctx: TenantContext) => {
    if (!canMutatePhiMap(ctx.orgRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await loadSystemForOrg(ctx.organizationId, id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.phiSystem.delete({ where: { id } });

    writeAuditLog({
      organizationId: ctx.organizationId,
      actorId: ctx.clerkUserId,
      action: "phi_map.system_deleted",
      resourceType: "PhiSystem",
      resourceId: id,
    });

    return NextResponse.json({ ok: true });
  })(req);
}
