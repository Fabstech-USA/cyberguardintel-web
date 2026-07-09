import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/audit-log";
import { hashEvidence } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { getObjectFromS3 } from "@/lib/s3";
import { withTenant, type TenantContext } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ id: string }> };

function hashMatches(
  computed: string,
  fileHash: string | null,
  metadataSha256: string | undefined
): boolean {
  if (fileHash && computed === fileHash) return true;
  if (metadataSha256 && computed === metadataSha256) return true;
  return false;
}

export async function GET(req: Request, { params }: RouteCtx): Promise<Response> {
  const { id } = await params;

  return withTenant(async (_request, ctx: TenantContext) => {
    const evidence = await prisma.evidence.findFirst({
      where: {
        id,
        organizationId: ctx.organizationId,
        isValid: true,
      },
      select: {
        id: true,
        title: true,
        s3Key: true,
        fileHash: true,
        mimeType: true,
      },
    });

    if (!evidence) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!evidence.s3Key) {
      return NextResponse.json({ error: "No file on record" }, { status: 404 });
    }

    const object = await getObjectFromS3(evidence.s3Key);
    const computed = hashEvidence(object.body);

    if (
      !hashMatches(
        computed,
        evidence.fileHash,
        object.metadata?.sha256
      )
    ) {
      return NextResponse.json(
        { error: "Integrity check failed" },
        { status: 409 }
      );
    }

    writeAuditLog({
      organizationId: ctx.organizationId,
      actorId: ctx.clerkUserId,
      action: "evidence.downloaded",
      resourceType: "Evidence",
      resourceId: evidence.id,
      metadata: { fileHash: computed },
    });

    const safeTitle = evidence.title.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const contentType = evidence.mimeType ?? object.contentType ?? "application/octet-stream";

    return new Response(new Uint8Array(object.body), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeTitle || "evidence"}"`,
        "X-Evidence-Hash": computed,
      },
    });
  })(req);
}
