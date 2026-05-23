import { withTenant } from "@/lib/tenant";
// Evidence writes should use createEvidence from @/lib/evidence-mutations
// so HIPAA readiness score recalculates automatically.

export const GET = withTenant(async (_req, _ctx) => {
  return Response.json({ ok: true });
});

export const POST = withTenant(async (_req, _ctx) => {
  return Response.json({ ok: true });
});
