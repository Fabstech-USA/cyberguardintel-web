// Webhooks authenticate via Clerk signature (not session). Do not use withTenant here.

export async function POST(_req: Request) {
  return Response.json({ ok: true });
}
