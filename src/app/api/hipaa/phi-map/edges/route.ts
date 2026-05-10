import { NextResponse } from "next/server";
import { PhiFlowDataClassification } from "@/generated/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { PhiFlowEdgeCreateSchema, canMutatePhiMap } from "@/lib/phi-map";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";

export const POST = withTenant(async (req, ctx) => {
  if (!canMutatePhiMap(ctx.orgRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: unknown = await req.json();
  const parsed = PhiFlowEdgeCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const source = await prisma.phiSystem.findFirst({
    where: { id: d.sourcePhiSystemId, organizationId: ctx.organizationId },
    select: { id: true },
  });
  if (!source) {
    return NextResponse.json({ error: "Source system not found" }, { status: 400 });
  }

  if (d.targetPhiSystemId) {
    const target = await prisma.phiSystem.findFirst({
      where: { id: d.targetPhiSystemId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Target system not found" }, { status: 400 });
    }
  }

  if (d.targetIntegrationId) {
    const integ = await prisma.integration.findFirst({
      where: { id: d.targetIntegrationId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!integ) {
      return NextResponse.json(
        { error: "Target integration not found" },
        { status: 400 }
      );
    }
  }

  if (d.viaIntegrationId) {
    const via = await prisma.integration.findFirst({
      where: { id: d.viaIntegrationId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!via) {
      return NextResponse.json(
        { error: "Via integration not found" },
        { status: 400 }
      );
    }
  }

  if (d.baaRecordId) {
    const baa = await prisma.baaRecord.findFirst({
      where: { id: d.baaRecordId, organizationId: ctx.organizationId },
      select: { id: true },
    });
    if (!baa) {
      return NextResponse.json({ error: "BAA record not found" }, { status: 400 });
    }
  }

  const created = await prisma.phiFlowEdge.create({
    data: {
      organizationId: ctx.organizationId,
      sourcePhiSystemId: d.sourcePhiSystemId,
      targetPhiSystemId: d.targetPhiSystemId ?? null,
      targetIntegrationId: d.targetIntegrationId ?? null,
      viaIntegrationId: d.viaIntegrationId ?? null,
      baaRecordId: d.baaRecordId ?? null,
      isExternalVendorFlow: d.isExternalVendorFlow ?? false,
      dataClassification:
        d.dataClassification ?? PhiFlowDataClassification.PHI,
    },
  });

  writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.clerkUserId,
    action: "phi_map.edge_created",
    resourceType: "PhiFlowEdge",
    resourceId: created.id,
  });

  return NextResponse.json(created, { status: 201 });
});
