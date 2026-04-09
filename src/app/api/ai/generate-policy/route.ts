import { withTenant } from '@/lib/tenant'

export const POST = withTenant(async (_req, _ctx) => {
  return Response.json({ ok: true })
})
