import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit-log";
import { PhiFlowEdgeUpdateSchema, canMutatePhiMap } from "@/lib/phi-map";
import { prisma } from "@/lib/prisma";
import { withTenant, type TenantContext } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ id: string }> };

async function loadEdge(
  organizationId: string,
  id: string
): Promise<{ id: string } | null> {
  return prisma.phiFlowEdge.findFirst({
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

    const existing = await loadEdge(ctx.organizationId, id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body: unknown = await request.json();
    const parsed = PhiFlowEdgeUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const current = await prisma.phiFlowEdge.findFirst({
      where: { id, organizationId: ctx.organizationId },
    });
    if (!current) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const nextSource = d.sourcePhiSystemId ?? current.sourcePhiSystemId;
    const nextTargetSys =
      d.targetPhiSystemId !== undefined
        ? d.targetPhiSystemId
        : current.targetPhiSystemId;
    const nextTargetInt =
      d.targetIntegrationId !== undefined
        ? d.targetIntegrationId
        : current.targetIntegrationId;

    if (d.sourcePhiSystemId) {
      const src = await prisma.phiSystem.findFirst({
        where: { id: d.sourcePhiSystemId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!src) {
        return NextResponse.json({ error: "Source system not found" }, { status: 400 });
      }
    }

    if (d.targetPhiSystemId !== undefined || d.targetIntegrationId !== undefined) {
      const hasSys = nextTargetSys !== null;
      const hasInt = nextTargetInt !== null;
      if (hasSys === hasInt) {
        return NextResponse.json(
          { error: "Exactly one of targetPhiSystemId or targetIntegrationId required" },
          { status: 400 }
        );
      }
    }

    if (nextTargetSys) {
      const t = await prisma.phiSystem.findFirst({
        where: { id: nextTargetSys, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!t) {
        return NextResponse.json({ error: "Target system not found" }, { status: 400 });
      }
    }
    if (nextTargetInt) {
      const t = await prisma.integration.findFirst({
        where: { id: nextTargetInt, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!t) {
        return NextResponse.json(
          { error: "Target integration not found" },
          { status: 400 }
        );
      }
    }

    if (d.viaIntegrationId !== undefined && d.viaIntegrationId !== null) {
      const v = await prisma.integration.findFirst({
        where: { id: d.viaIntegrationId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!v) {
        return NextResponse.json(
          { error: "Via integration not found" },
          { status: 400 }
        );
      }
    }

    if (d.baaRecordId !== undefined && d.baaRecordId !== null) {
      const baa = await prisma.baaRecord.findFirst({
        where: { id: d.baaRecordId, organizationId: ctx.organizationId },
        select: { id: true },
      });
      if (!baa) {
        return NextResponse.json({ error: "BAA record not found" }, { status: 400 });
      }
    }

    const updated = await prisma.phiFlowEdge.update({
      where: { id },
      data: {
        ...(d.sourcePhiSystemId !== undefined
          ? { sourcePhiSystemId: nextSource }
          : {}),
        ...(d.targetPhiSystemId !== undefined
          ? { targetPhiSystemId: nextTargetSys }
          : {}),
        ...(d.targetIntegrationId !== undefined
          ? { targetIntegrationId: nextTargetInt }
          : {}),
        ...(d.viaIntegrationId !== undefined
          ? { viaIntegrationId: d.viaIntegrationId }
          : {}),
        ...(d.baaRecordId !== undefined
          ? { baaRecordId: d.baaRecordId }
          : {}),
        ...(d.isExternalVendorFlow !== undefined
          ? { isExternalVendorFlow: d.isExternalVendorFlow }
          : {}),
        ...(d.dataClassification !== undefined
          ? { dataClassification: d.dataClassification }
          : {}),
      },
    });

    writeAuditLog({
      organizationId: ctx.organizationId,
      actorId: ctx.clerkUserId,
      action: "phi_map.edge_updated",
      resourceType: "PhiFlowEdge",
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

    const existing = await loadEdge(ctx.organizationId, id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.phiFlowEdge.delete({ where: { id } });

    writeAuditLog({
      organizationId: ctx.organizationId,
      actorId: ctx.clerkUserId,
      action: "phi_map.edge_deleted",
      resourceType: "PhiFlowEdge",
      resourceId: id,
    });

    return NextResponse.json({ ok: true });
  })(req);
}
