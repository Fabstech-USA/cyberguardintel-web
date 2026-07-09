import { NextResponse } from "next/server";
import { z } from "zod";

import { EvidenceSource } from "@/generated/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { createEvidence } from "@/lib/evidence-mutations";
import { prisma } from "@/lib/prisma";
import { uploadEvidenceFile } from "@/lib/s3";
import { withTenant } from "@/lib/tenant";

const uploadSchema = z.object({
  orgControlId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  evidenceType: z.string().optional(),
});

export const POST = withTenant(async (req, ctx) => {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload payload" }, { status: 400 });
  }

  const file = formData.get("file");
  if (
    !file ||
    typeof file !== "object" ||
    !("arrayBuffer" in file) ||
    typeof file.arrayBuffer !== "function"
  ) {
    return NextResponse.json({ error: "Missing file upload" }, { status: 400 });
  }

  const parsed = uploadSchema.safeParse({
    orgControlId: formData.get("orgControlId"),
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    evidenceType: formData.get("evidenceType") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const orgControl = await prisma.orgControl.findFirst({
    where: {
      id: parsed.data.orgControlId,
      organizationId: ctx.organizationId,
    },
    select: { id: true },
  });

  if (!orgControl) {
    return NextResponse.json({ error: "Control not found" }, { status: 404 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length === 0) {
    return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
  }

  const fileName =
    typeof file === "object" &&
    file !== null &&
    "name" in file &&
    typeof file.name === "string" &&
    file.name.trim()
      ? file.name
      : "evidence-upload.bin";

  const mimeType =
    typeof file === "object" &&
    file !== null &&
    "type" in file &&
    typeof file.type === "string" &&
    file.type.trim()
      ? file.type
      : "application/octet-stream";

  const uploaded = await uploadEvidenceFile({
    orgId: ctx.organizationId,
    controlId: orgControl.id,
    fileName,
    content: bytes,
    mimeType,
  });

  const evidence = await createEvidence({
    organizationId: ctx.organizationId,
    orgControlId: orgControl.id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    sourceType: EvidenceSource.MANUAL,
    s3Key: uploaded.s3Key,
    mimeType,
    fileHash: uploaded.fileHash,
    evidenceType: parsed.data.evidenceType,
    metadata: {
      evidenceType: parsed.data.evidenceType ?? "report",
      fileName,
    },
  });

  writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.clerkUserId,
    action: "evidence.created",
    resourceType: "Evidence",
    resourceId: evidence.id,
    metadata: { source: "manual_upload" },
  });

  return NextResponse.json({ evidence: { id: evidence.id } }, { status: 201 });
});
