import { withTenant } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const _params = await context.params
  return withTenant(async (_req, _tenant) => {
    return NextResponse.json({ ok: true })
  })(req)
}
