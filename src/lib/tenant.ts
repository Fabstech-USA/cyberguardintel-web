// src/lib/tenant.ts
// HIPAA 164.312(a)(1): Access Control - enforces tenant isolation on every request

import 'server-only'

import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { writeAuditLog } from '@/lib/audit-log'
import { NextResponse } from 'next/server'

export type TenantContext = {
  organizationId: string
  clerkUserId: string
  orgRole: string
}

export function withTenant(handler: (req: Request, ctx: TenantContext) => Promise<Response>) {
  return async (req: Request) => {
    const { userId, orgId } = await auth()

    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify membership in our own database as defense-in-depth
    const member = await prisma.orgMember.findUnique({
      where: {
        clerkUserId_organizationId: { clerkUserId: userId, organizationId: orgId },
      },
    })

    if (!member) {
      writeAuditLog({
        organizationId: orgId,
        actorId: userId,
        action: 'security.unauthorized_access_attempt',
        resourceType: 'Organization',
        resourceId: orgId,
      })
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return handler(req, {
      organizationId: orgId,
      clerkUserId: userId,
      orgRole: member.role,
    })
  }
}

// CORRECT: always scope queries with organizationId
// const evidence = await prisma.evidence.findMany({
//   where: { organizationId, orgControlId }
// })

// WRONG: never query without organizationId
// const evidence = await prisma.evidence.findMany({
//   where: { orgControlId }  // This leaks data across tenants
// })

