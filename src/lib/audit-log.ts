import 'server-only'

import { prisma } from '@/lib/prisma'

type WriteAuditLogArgs = {
  organizationId: string
  actorId: string
  actorEmail?: string
  action: string
  resourceType: string
  resourceId?: string
  metadata?: unknown
  ipAddress?: string
  userAgent?: string
}

export async function writeAuditLog(args: WriteAuditLogArgs) {
  await prisma.auditLog.create({
    data: {
      organizationId: args.organizationId,
      actorId: args.actorId,
      actorEmail: args.actorEmail,
      action: args.action,
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      metadata: args.metadata as any,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    },
  })
}
