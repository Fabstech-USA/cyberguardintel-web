import { z } from "zod";
import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/audit-log";
import {
  AUDIT_PACKAGE_SECTION_IDS,
  type AuditProgressStep,
} from "@/lib/audit-package-sections";
import { enqueueAuditExportJob } from "@/lib/queue/audit-export-producer";
import { getSignedDownloadUrl } from "@/lib/s3";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";

const dateStringSchema = z
  .string()
  .min(1)
  .refine((v) => !Number.isNaN(Date.parse(v)) || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    message: "Invalid date",
  });

const postBodySchema = z.object({
  from: dateStringSchema,
  to: dateStringSchema,
  controlRefs: z.array(z.string().min(1)).optional(),
  sections: z
    .array(z.enum(AUDIT_PACKAGE_SECTION_IDS as unknown as [string, ...string[]]))
    .optional(),
});

function parseBoundaryDate(raw: string, endOfDay: boolean): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const suffix = endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z";
    return new Date(`${raw}${suffix}`);
  }
  return new Date(raw);
}

function parseProgressSteps(value: unknown): AuditProgressStep[] {
  if (!Array.isArray(value)) return [];
  return value.filter((step): step is AuditProgressStep => {
    if (!step || typeof step !== "object") return false;
    const s = step as Record<string, unknown>;
    return (
      typeof s.id === "string" &&
      typeof s.label === "string" &&
      (s.status === "pending" ||
        s.status === "running" ||
        s.status === "done" ||
        s.status === "error")
    );
  });
}

export const POST = withTenant(async (req, ctx) => {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = postBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const from = parseBoundaryDate(parsed.data.from, false);
  const to = parseBoundaryDate(parsed.data.to, true);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }
  if (from > to) {
    return NextResponse.json(
      { error: "`from` must be on or before `to`" },
      { status: 400 }
    );
  }

  const result = await enqueueAuditExportJob({
    organizationId: ctx.organizationId,
    from,
    to,
    controlRefs: parsed.data.controlRefs,
    sections: parsed.data.sections,
  });

  writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.clerkUserId,
    action: "audit_package.requested",
    resourceType: "AuditExportJob",
    resourceId: result.jobId,
    metadata: {
      from: from.toISOString(),
      to: to.toISOString(),
      controlRefs: parsed.data.controlRefs ?? [],
      sections: parsed.data.sections ?? [],
    },
  });

  return NextResponse.json(result, { status: 202 });
});

export const GET = withTenant(async (req, ctx) => {
  const jobId = new URL(req.url).searchParams.get("jobId")?.trim();
  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const job = await prisma.auditExportJob.findFirst({
    where: { id: jobId, organizationId: ctx.organizationId },
  });

  if (!job) {
    return NextResponse.json({ error: "Export job not found" }, { status: 404 });
  }

  const steps = parseProgressSteps(job.progressSteps);
  const doneCount = steps.filter((s) => s.status === "done").length;
  const progressPercent =
    steps.length === 0 ? 0 : Math.round((doneCount / steps.length) * 100);

  const base = {
    jobId: job.id,
    status: job.status,
    from: job.fromDate.toISOString(),
    to: job.toDate.toISOString(),
    controlRefs: job.controlRefs,
    sections: job.sections,
    steps,
    currentStep: job.currentStep,
    progressPercent: job.status === "COMPLETED" ? 100 : progressPercent,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
  };

  if (job.status === "COMPLETED" && job.s3Key) {
    const signedUrl = await getSignedDownloadUrl(job.s3Key);
    return NextResponse.json({ ...base, s3Key: job.s3Key, signedUrl });
  }

  return NextResponse.json(base);
});
