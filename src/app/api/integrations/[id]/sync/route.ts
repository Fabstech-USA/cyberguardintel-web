type Ctx = { params: { id: string } };

export async function POST(_req: Request, _ctx: Ctx) {
  return Response.json({ ok: true });
}

