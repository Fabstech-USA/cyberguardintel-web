import { withTenant } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
  const _params = await context.params
  return withTenant(async (_req, _tenant) => {
    return NextResponse.json({})
  })(req)
}
