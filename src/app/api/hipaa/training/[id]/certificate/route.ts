import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { getSignedDownloadUrl } from "@/lib/s3";
import { withTenant, type TenantContext } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ id: string }> };

async function loadAttestationKeyForOrg(
  organizationId: string,
  id: string
): Promise<{ id: string; attestationS3Key: string | null } | null> {
  return prisma.trainingRecord.findFirst({
    where: { id, organizationId },
    select: { id: true, attestationS3Key: true },
  });
}

export async function GET(req: Request, { params }: RouteCtx): Promise<Response> {
  const { id } = await params;
  return withTenant(async (_request, ctx: TenantContext) => {
    const record = await loadAttestationKeyForOrg(ctx.organizationId, id);
    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!record.attestationS3Key) {
      return NextResponse.json({ error: "No certificate on file" }, { status: 404 });
    }

    const url = await getSignedDownloadUrl(record.attestationS3Key);

    writeAuditLog({
      organizationId: ctx.organizationId,
      actorId: ctx.clerkUserId,
      action: "training.certificate_downloaded",
      resourceType: "TrainingRecord",
      resourceId: record.id,
    });

    return NextResponse.json({ url });
  })(req);
}
