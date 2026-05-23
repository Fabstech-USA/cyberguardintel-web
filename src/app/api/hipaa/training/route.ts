import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { createTrainingRecordWithAttestation } from "@/lib/training-mutations";
import { loadTrainingBundle } from "@/lib/training-server";
import {
  TrainingBulkCreateSchema,
  TrainingRecordCreateSchema,
  canMutateTraining,
  type TrainingRecordCreateInput,
} from "@/lib/training";
import { withTenant } from "@/lib/tenant";

export const GET = withTenant(async (_req, ctx) => {
  const { orgId } = await auth();
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const bundle = await loadTrainingBundle(ctx.organizationId, orgId);
  return NextResponse.json(bundle);
});

export const POST = withTenant(async (req, ctx) => {
  if (!canMutateTraining(ctx.orgRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const bulkParsed = TrainingBulkCreateSchema.safeParse(body);
  const singleParsed = TrainingRecordCreateSchema.safeParse(body);

  let records: TrainingRecordCreateInput[] = [];

  if (bulkParsed.success) {
    records = bulkParsed.data.records;
  } else if (singleParsed.success) {
    records = [singleParsed.data];
  } else {
    const details =
      bulkParsed.error?.flatten() ?? singleParsed.error?.flatten();
    return NextResponse.json(
      { error: "Validation failed", details },
      { status: 400 }
    );
  }

  const organization = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { name: true },
  });
  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const created = [];
  for (const recordInput of records) {
    const row = await createTrainingRecordWithAttestation(
      ctx.organizationId,
      organization.name,
      recordInput
    );
    created.push(row);

    writeAuditLog({
      organizationId: ctx.organizationId,
      actorId: ctx.clerkUserId,
      action: "training.recorded",
      resourceType: "TrainingRecord",
      resourceId: row.id,
      metadata: {
        employeeId: row.employeeId,
        trainingTitle: row.trainingTitle,
      },
    });
  }

  return NextResponse.json({ created }, { status: 201 });
});
