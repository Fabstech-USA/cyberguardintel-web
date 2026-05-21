import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import {
  computeNextDueAt,
  TrainingRecordUpdateSchema,
  canMutateTraining,
} from "@/lib/training";
import { regenerateTrainingAttestation } from "@/lib/training-mutations";
import { withTenant, type TenantContext } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ id: string }> };

async function loadTrainingForOrg(
  organizationId: string,
  id: string
) {
  return prisma.trainingRecord.findFirst({
    where: { id, organizationId },
  });
}

export async function PATCH(req: Request, { params }: RouteCtx): Promise<Response> {
  const { id } = await params;
  return withTenant(async (request, ctx: TenantContext) => {
    if (!canMutateTraining(ctx.orgRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await loadTrainingForOrg(ctx.organizationId, id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const parsed = TrainingRecordUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const completedAt = data.completedAt ?? existing.completedAt;
    const nextDueAt = data.completedAt
      ? computeNextDueAt(completedAt)
      : existing.nextDueAt;

    let updated = await prisma.trainingRecord.update({
      where: { id },
      data: {
        ...(data.employeeId !== undefined ? { employeeId: data.employeeId } : {}),
        ...(data.employeeName !== undefined
          ? { employeeName: data.employeeName }
          : {}),
        ...(data.employeeEmail !== undefined
          ? { employeeEmail: data.employeeEmail }
          : {}),
        ...(data.employeeJobTitle !== undefined
          ? { employeeJobTitle: data.employeeJobTitle }
          : {}),
        ...(data.trainingTitle !== undefined
          ? { trainingTitle: data.trainingTitle }
          : {}),
        ...(data.completedAt !== undefined
          ? { completedAt, nextDueAt }
          : {}),
      },
    });

    const organization = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { name: true },
    });
    if (organization) {
      updated = await regenerateTrainingAttestation(
        ctx.organizationId,
        organization.name,
        updated
      );
    }

    writeAuditLog({
      organizationId: ctx.organizationId,
      actorId: ctx.clerkUserId,
      action: "training.updated",
      resourceType: "TrainingRecord",
      resourceId: updated.id,
      metadata: {
        employeeId: updated.employeeId,
        trainingTitle: updated.trainingTitle,
      },
    });

    return NextResponse.json(updated);
  })(req);
}

export async function DELETE(req: Request, { params }: RouteCtx): Promise<Response> {
  const { id } = await params;
  return withTenant(async (_request, ctx: TenantContext) => {
    if (!canMutateTraining(ctx.orgRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await loadTrainingForOrg(ctx.organizationId, id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.trainingRecord.delete({ where: { id } });

    writeAuditLog({
      organizationId: ctx.organizationId,
      actorId: ctx.clerkUserId,
      action: "training.deleted",
      resourceType: "TrainingRecord",
      resourceId: id,
    });

    return NextResponse.json({ ok: true });
  })(req);
}
