import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/audit-log";
import { toIntegrationPublicDto } from "@/lib/integration-api";
import { validateUpdateIntegrationStatusBody } from "@/lib/integration-route-validation";
import { prisma } from "@/lib/prisma";
import { withTenant, type TenantContext } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteCtx): Promise<Response> {
  const { id } = await params;

  return withTenant(async (request, ctx: TenantContext) => {
    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const validated = validateUpdateIntegrationStatusBody(body);
    if (!validated.success) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const existing = await prisma.integration.findFirst({
      where: { id, organizationId: ctx.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.integration.update({
      where: { id },
      data: {
        status: validated.data.status,
        errorMessage:
          validated.data.status === "ACTIVE" ? null : existing.errorMessage,
      },
    });

    writeAuditLog({
      organizationId: ctx.organizationId,
      actorId: ctx.clerkUserId,
      action:
        validated.data.status === "DISCONNECTED"
          ? "integration.disconnected"
          : "integration.status_updated",
      resourceType: "Integration",
      resourceId: updated.id,
      metadata: { type: updated.type, status: updated.status },
    });

    return NextResponse.json(toIntegrationPublicDto(updated));
  })(req);
}

export async function DELETE(req: Request, { params }: RouteCtx): Promise<Response> {
  const { id } = await params;

  return withTenant(async (_request, ctx: TenantContext) => {
    const existing = await prisma.integration.findFirst({
      where: { id, organizationId: ctx.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.integration.delete({ where: { id } });

    writeAuditLog({
      organizationId: ctx.organizationId,
      actorId: ctx.clerkUserId,
      action: "integration.disconnected",
      resourceType: "Integration",
      resourceId: existing.id,
      metadata: { type: existing.type, deleted: true },
    });

    return NextResponse.json({ ok: true });
  })(req);
}
