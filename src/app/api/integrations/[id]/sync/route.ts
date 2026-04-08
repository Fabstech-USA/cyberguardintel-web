type Ctx = { params?: any };

export async function POST(_req: Request, _ctx: Ctx) {
  return Response.json({ ok: true });
}

