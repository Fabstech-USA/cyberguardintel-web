import { NextResponse } from "next/server";

import { FrameworkSlug } from "@/generated/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { getSignedDownloadUrl } from "@/lib/s3";
import { withTenant, type TenantContext } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ id: string }> };

async function loadSourceDocumentForOrg(
  organizationId: string,
  id: string
): Promise<{
  id: string;
  sourceS3Key: string | null;
  sourceFileName: string | null;
} | null> {
  return prisma.policy.findFirst({
    where: {
      id,
      organizationId,
      frameworkSlug: FrameworkSlug.HIPAA,
    },
    select: {
      id: true,
      sourceS3Key: true,
      sourceFileName: true,
    },
  });
}

export async function GET(req: Request, { params }: RouteCtx): Promise<Response> {
  const { id } = await params;
  return withTenant(async (_request, ctx: TenantContext) => {
    const policy = await loadSourceDocumentForOrg(ctx.organizationId, id);
    if (!policy) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!policy.sourceS3Key) {
      return NextResponse.json({ error: "No source file on record" }, { status: 404 });
    }

    const url = await getSignedDownloadUrl(policy.sourceS3Key);

    writeAuditLog({
      organizationId: ctx.organizationId,
      actorId: ctx.clerkUserId,
      action: "policy.document_viewed",
      resourceType: "Policy",
      resourceId: policy.id,
      metadata: {
        sourceFileName: policy.sourceFileName,
      },
    });

    return NextResponse.json({ url });
  })(req);
}
