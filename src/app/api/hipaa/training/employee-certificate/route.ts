import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { getSignedDownloadUrl } from "@/lib/s3";
import { TRAINING_TOPIC_TITLES } from "@/lib/training";
import {
  generateEmployeeAttestationPdf,
  uploadEmployeeAttestation,
} from "@/lib/training-certificate";
import { withTenant, type TenantContext } from "@/lib/tenant";

const QuerySchema = z.object({
  employeeId: z.string().trim().min(1),
});

export const GET = withTenant(async (req, ctx: TenantContext) => {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    employeeId: url.searchParams.get("employeeId"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { employeeId } = parsed.data;
  const records = await prisma.trainingRecord.findMany({
    where: { organizationId: ctx.organizationId, employeeId },
    orderBy: { completedAt: "desc" },
  });

  if (records.length === 0) {
    return NextResponse.json({ error: "No training records" }, { status: 404 });
  }

  const latestByTopic = new Map<string, (typeof records)[number]>();
  for (const record of records) {
    if (!latestByTopic.has(record.trainingTitle)) {
      latestByTopic.set(record.trainingTitle, record);
    }
  }

  const missing = TRAINING_TOPIC_TITLES.filter((t) => !latestByTopic.has(t));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: "Incomplete training", missingTopics: missing },
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

  const sample = records[0];
  const topics = TRAINING_TOPIC_TITLES.map((title) => {
    const record = latestByTopic.get(title)!;
    return {
      trainingTitle: title,
      completedAt: record.completedAt,
      nextDueAt: record.nextDueAt,
    };
  });

  const pdfBytes = await generateEmployeeAttestationPdf({
    organizationName: organization.name,
    employeeName: sample.employeeName,
    employeeEmail: sample.employeeEmail,
    topics,
  });

  const key = await uploadEmployeeAttestation(
    ctx.organizationId,
    employeeId,
    pdfBytes
  );
  const downloadUrl = await getSignedDownloadUrl(key);

  writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.clerkUserId,
    action: "training.employee_certificate_downloaded",
    resourceType: "TrainingRecord",
    metadata: { employeeId },
  });

  return NextResponse.json({ url: downloadUrl });
});
