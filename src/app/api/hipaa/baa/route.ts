import { NextResponse } from "next/server";

import { writeAuditLog } from "@/lib/audit-log";
import {
  BaaCreateSchema,
  canMutateBaa,
  normalizeBaaWriteInput,
} from "@/lib/baa";
import { loadBaaTrackerBundle } from "@/lib/baa-server";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";

export const GET = withTenant(async (_req, ctx) => {
  const bundle = await loadBaaTrackerBundle(ctx.organizationId);
  return NextResponse.json(bundle);
});

export const POST = withTenant(async (req, ctx) => {
  if (!canMutateBaa(ctx.orgRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = BaaCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = normalizeBaaWriteInput(parsed.data);
  const created = await prisma.baaRecord.create({
    data: {
      organizationId: ctx.organizationId,
      vendorName: data.vendorName,
      vendorEmail: data.vendorEmail ?? null,
      services: data.services,
      status: data.status,
      signedAt: data.signedAt ?? null,
      expiresAt: data.expiresAt ?? null,
      documentS3Key: data.documentS3Key ?? null,
      notes: data.notes ?? null,
    },
  });

  writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.clerkUserId,
    action: "baa.created",
    resourceType: "BaaRecord",
    resourceId: created.id,
    metadata: { status: created.status, vendorName: created.vendorName },
  });

  return NextResponse.json(created, { status: 201 });
});
