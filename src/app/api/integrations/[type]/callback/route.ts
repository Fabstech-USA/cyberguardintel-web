import { withTenant } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export async function GET(req: Request, context: { params: Promise<{ type: string }> }) {
  const _params = await context.params
  return withTenant(async (_req, _tenant) => {
    return NextResponse.redirect(new URL('/', 'http://localhost'))
  })(req)
}
