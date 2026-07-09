import { NextResponse } from "next/server";

import { toIntegrationPublicDto } from "@/lib/integration-api";
import { prisma } from "@/lib/prisma";
import { withTenant, type TenantContext } from "@/lib/tenant";

type RouteCtx = { params: Promise<{ jobId: string }> };

export async function GET(req: Request, { params }: RouteCtx): Promise<Response> {
  const { jobId } = await params;

  return withTenant(async (_request, ctx: TenantContext) => {
    const job = await prisma.collectionJob.findFirst({
      where: {
        id: jobId,
        organizationId: ctx.organizationId,
      },
      include: {
        integration: {
          include: {
            _count: {
              select: {
                evidence: { where: { isValid: true } },
              },
            },
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        evidenceAdded: job.evidenceAdded,
        errorMessage: job.errorMessage,
        completedAt: job.completedAt?.toISOString() ?? null,
      },
      integration: job.integration
        ? toIntegrationPublicDto(job.integration)
        : null,
    });
  })(req);
}
