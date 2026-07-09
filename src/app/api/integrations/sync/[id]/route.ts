import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAuditLog } from "@/lib/audit-log";
import { enqueueCollectionJob } from "@/lib/queue";
import { prisma } from "@/lib/prisma";
import { withTenant, type TenantContext } from "@/lib/tenant";
import { IntegrationStatus } from "@/generated/prisma";

type RouteCtx = { params: Promise<{ id: string }> };

const syncBodySchema = z.object({
  jobType: z.enum(["FULL", "INCREMENTAL"]).optional(),
});

export async function POST(req: Request, { params }: RouteCtx): Promise<Response> {
  const { id } = await params;

  return withTenant(async (request, ctx: TenantContext) => {
    let body: unknown = {};
    try {
      const text = await request.text();
      if (text.trim()) {
        body = JSON.parse(text);
      }
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = syncBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const integration = await prisma.integration.findFirst({
      where: { id, organizationId: ctx.organizationId },
    });

    if (!integration) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (integration.status !== IntegrationStatus.ACTIVE) {
      return NextResponse.json(
        { error: "Integration is not active" },
        { status: 409 }
      );
    }

    try {
      const result = await enqueueCollectionJob({
        organizationId: ctx.organizationId,
        integrationId: integration.id,
        jobType: parsed.data.jobType,
      });

      writeAuditLog({
        organizationId: ctx.organizationId,
        actorId: ctx.clerkUserId,
        action: "integration.synced",
        resourceType: "Integration",
        resourceId: integration.id,
        metadata: {
          type: integration.type,
          jobId: result.jobId,
          jobType: parsed.data.jobType ?? "INCREMENTAL",
        },
      });

      return NextResponse.json(result, { status: 202 });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to enqueue collection job";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  })(req);
}
