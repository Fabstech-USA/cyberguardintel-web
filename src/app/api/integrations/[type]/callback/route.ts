type Ctx = { params: { type: string } };

export async function GET(_req: Request, _ctx: Ctx) {
  return Response.json({ ok: true });
}

