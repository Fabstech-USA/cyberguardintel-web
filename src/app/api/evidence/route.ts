import { NextResponse } from "next/server";
import { z } from "zod";

import type { FreshnessTier } from "@/lib/evidence-freshness";
import { listEvidence } from "@/lib/evidence-queries";
import { withTenant } from "@/lib/tenant";

const listQuerySchema = z.object({
  source: z.string().optional(),
  controlRef: z.string().optional(),
  freshness: z.enum(["fresh", "expiring", "stale"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export const GET = withTenant(async (req, ctx) => {
  const url = new URL(req.url);
  const parsed = listQuerySchema.safeParse({
    source: url.searchParams.get("source") ?? undefined,
    controlRef: url.searchParams.get("controlRef") ?? undefined,
    freshness: url.searchParams.get("freshness") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await listEvidence({
    organizationId: ctx.organizationId,
    source: parsed.data.source,
    controlRef: parsed.data.controlRef,
    freshness: parsed.data.freshness as FreshnessTier | undefined,
    collectedFrom: parseDate(parsed.data.from),
    collectedTo: parseDate(parsed.data.to),
    q: parsed.data.q,
    cursor: parsed.data.cursor,
    limit: parsed.data.limit,
  });

  return NextResponse.json(result);
});
