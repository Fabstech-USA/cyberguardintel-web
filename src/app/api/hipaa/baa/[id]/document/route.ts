import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { getSignedDownloadUrl } from "@/lib/s3";
import { withTenant, type TenantContext } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ id: string }> };

async function loadDocumentKeyForOrg(
  organizationId: string,
  id: string
): Promise<{ id: string; documentS3Key: string | null } | null> {
  return prisma.baaRecord.findFirst({
    where: { id, organizationId },
    select: { id: true, documentS3Key: true },
  });
}

export async function GET(req: Request, { params }: RouteCtx): Promise<Response> {
  const { id } = await params;
  return withTenant(async (_request, ctx: TenantContext) => {
    const record = await loadDocumentKeyForOrg(ctx.organizationId, id);
    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!record.documentS3Key) {
      return NextResponse.json({ error: "No PDF on file" }, { status: 404 });
    }

    const url = await getSignedDownloadUrl(record.documentS3Key);

    writeAuditLog({
      organizationId: ctx.organizationId,
      actorId: ctx.clerkUserId,
      action: "baa.document_viewed",
      resourceType: "BaaRecord",
      resourceId: record.id,
    });

    return NextResponse.json({ url });
  })(req);
}
