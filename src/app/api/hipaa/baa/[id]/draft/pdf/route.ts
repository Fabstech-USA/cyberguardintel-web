import { NextResponse } from "next/server";

import {
  baaDraftPdfS3Key,
  generateBaaMarkdownPdf,
} from "@/lib/baa-markdown-pdf";
import { canMutateBaa } from "@/lib/baa";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { getSignedDownloadUrl, putObjectToS3 } from "@/lib/s3";
import { withTenant, type TenantContext } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ id: string }> };

async function loadDraftForOrg(organizationId: string, id: string) {
  return prisma.baaRecord.findFirst({
    where: { id, organizationId },
    select: {
      id: true,
      vendorName: true,
      draftTitle: true,
      draftMarkdown: true,
      draftPdfS3Key: true,
    },
  });
}

/** Return a presigned URL for the shareable draft PDF. */
export async function GET(req: Request, { params }: RouteCtx): Promise<Response> {
  const { id } = await params;
  return withTenant(async (_request, ctx: TenantContext) => {
    const record = await loadDraftForOrg(ctx.organizationId, id);
    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!record.draftPdfS3Key) {
      return NextResponse.json(
        { error: "No draft PDF generated yet" },
        { status: 404 }
      );
    }

    const url = await getSignedDownloadUrl(record.draftPdfS3Key);

    writeAuditLog({
      organizationId: ctx.organizationId,
      actorId: ctx.clerkUserId,
      action: "baa.draft_pdf_viewed",
      resourceType: "BaaRecord",
      resourceId: record.id,
    });

    return NextResponse.json({ url });
  })(req);
}

/** Render draft markdown to PDF, store in S3, return presigned download URL. */
export async function POST(req: Request, { params }: RouteCtx): Promise<Response> {
  const { id } = await params;
  return withTenant(async (_request, ctx: TenantContext) => {
    if (!canMutateBaa(ctx.orgRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const record = await loadDraftForOrg(ctx.organizationId, id);
    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!record.draftMarkdown?.trim()) {
      return NextResponse.json(
        { error: "Save a BAA draft before generating a PDF" },
        { status: 400 }
      );
    }

    const title =
      record.draftTitle?.trim() || "Business Associate Agreement";
    const pdfBytes = await generateBaaMarkdownPdf({
      title,
      markdown: record.draftMarkdown,
      footer: `Draft BAA for ${record.vendorName} — for review and electronic signature`,
    });

    const key = baaDraftPdfS3Key(ctx.organizationId, record.id);
    await putObjectToS3(key, pdfBytes, "application/pdf");

    await prisma.baaRecord.update({
      where: { id: record.id },
      data: { draftPdfS3Key: key },
    });

    const url = await getSignedDownloadUrl(key);

    writeAuditLog({
      organizationId: ctx.organizationId,
      actorId: ctx.clerkUserId,
      action: "baa.draft_pdf_generated",
      resourceType: "BaaRecord",
      resourceId: record.id,
    });

    return NextResponse.json({ url, key });
  })(req);
}
