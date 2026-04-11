import { withTenant } from '@/lib/tenant'

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: RouteCtx) {
  await params
  return withTenant(async (_r, _ctx) => {
    return Response.json({ ok: true })
  })(req)
}

export async function POST(req: Request, { params }: RouteCtx) {
  await params
  return withTenant(async (_r, _ctx) => {
    return Response.json({ ok: true })
  })(req)
}
