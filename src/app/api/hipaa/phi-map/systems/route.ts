import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit-log";
import { PhiSystemCreateSchema, canMutatePhiMap } from "@/lib/phi-map";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";

export const POST = withTenant(async (req, ctx) => {
  if (!canMutatePhiMap(ctx.orgRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: unknown = await req.json();
  const parsed = PhiSystemCreateSchema.safeParse(body);
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

  const created = await prisma.phiSystem.create({
    data: {
      organizationId: ctx.organizationId,
      name: d.name,
      systemType: d.systemType,
      description: d.description ?? undefined,
      containsPhi: d.containsPhi ?? true,
      phiTypes: d.phiTypes ?? [],
      accessControls: d.accessControls ?? undefined,
      encryptionAtRest: d.encryptionAtRest ?? false,
      encryptionInTransit: d.encryptionInTransit ?? false,
      phiCreates: d.phiCreates ?? false,
      phiTransmits: d.phiTransmits ?? false,
      phiStores: d.phiStores ?? false,
      phiDestroys: d.phiDestroys ?? false,
      baaRecordId: d.baaRecordId ?? undefined,
    },
  });

  writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.clerkUserId,
    action: "phi_map.system_created",
    resourceType: "PhiSystem",
    resourceId: created.id,
  });

  return NextResponse.json(created, { status: 201 });
});
