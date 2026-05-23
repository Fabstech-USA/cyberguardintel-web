import { withTenant } from "@/lib/tenant";
// After integration evidence sync writes, call createEvidence from
// @/lib/evidence-mutations (triggers score recalculation).

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteCtx) {
  await params;
  return withTenant(async (_r, _ctx) => {
    return Response.json({ ok: true });
  })(req);
}
