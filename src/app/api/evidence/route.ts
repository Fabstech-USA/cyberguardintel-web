import { withTenant } from '@/lib/tenant'

export const GET = withTenant(async (_req, _ctx) => {
  return Response.json({ ok: true })
})

export const POST = withTenant(async (_req, _ctx) => {
  return Response.json({ ok: true })
})
