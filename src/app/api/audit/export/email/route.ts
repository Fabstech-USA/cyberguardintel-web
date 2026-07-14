import { z } from "zod";
import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/audit-log";
import { sendEmail } from "@/lib/email";
import { getSignedDownloadUrl } from "@/lib/s3";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";

const bodySchema = z.object({
  jobId: z.string().min(1),
  to: z.string().email(),
});

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export const POST = withTenant(async (req, ctx) => {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const job = await prisma.auditExportJob.findFirst({
    where: {
      id: parsed.data.jobId,
      organizationId: ctx.organizationId,
      status: "COMPLETED",
    },
  });

  if (!job || !job.s3Key) {
    return NextResponse.json(
      { error: "Completed export job not found" },
      { status: 404 }
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { name: true },
  });

  const signedUrl = await getSignedDownloadUrl(job.s3Key);
  const orgName = org?.name ?? "Your organization";
  const orgNameHtml = escapeHtml(orgName);
  const fromLabel = job.fromDate.toISOString().slice(0, 10);
  const toLabel = job.toDate.toISOString().slice(0, 10);

  await sendEmail({
    to: parsed.data.to,
    subject: `${orgName} — HIPAA audit package`,
    html: `
      <p>Hello,</p>
      <p><strong>${orgNameHtml}</strong> has shared a HIPAA audit package for the period
      <strong>${fromLabel}</strong> to <strong>${toLabel}</strong>.</p>
      <p><a href="${signedUrl}">Download the audit package (ZIP)</a></p>
      <p>This is a read-only signed URL that expires in approximately 15 minutes.
      Request a new link from the organization if it expires.</p>
      <p>CyberGuardIntel — chain of custody: export job ${job.id}</p>
    `,
  });

  writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.clerkUserId,
    action: "audit_package.emailed",
    resourceType: "AuditExportJob",
    resourceId: job.id,
    metadata: {
      to: parsed.data.to,
      jobId: job.id,
      s3Key: job.s3Key,
    },
  });

  return NextResponse.json({ ok: true });
});
