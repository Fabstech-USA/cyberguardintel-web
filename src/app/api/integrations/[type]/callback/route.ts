import { withTenant } from '@/lib/tenant'

type RouteCtx = { params: Promise<{ type: string }> }

export async function GET(req: Request, { params }: RouteCtx) {
  await params
  return withTenant(async (_r, _ctx) => {
    return Response.json({ ok: true })
  })(req)
}
