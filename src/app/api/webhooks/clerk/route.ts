import { withTenant } from '@/lib/tenant'
import { NextResponse } from 'next/server'

export const POST = withTenant(async (_req, _tenant) => {
  return NextResponse.json({ ok: true })
})
