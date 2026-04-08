type Ctx = { params: { id: string } };

export async function GET(_req: Request, _ctx: Ctx) {
  return Response.json({ ok: true });
}

export async function POST(_req: Request, _ctx: Ctx) {
  return Response.json({ ok: true });
}

