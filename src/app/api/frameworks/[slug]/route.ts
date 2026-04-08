type Ctx = { params: { slug: string } };

export async function GET(_req: Request, _ctx: Ctx) {
  return Response.json({ ok: true });
}

