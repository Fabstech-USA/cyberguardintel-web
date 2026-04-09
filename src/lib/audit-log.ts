// src/lib/audit-log.ts
// HIPAA 164.312(b): Audit Controls
// Call this function after EVERY mutation in every API route.

import { prisma } from '@/lib/prisma'

type AuditEntry = {
  organizationId: string
  actorId:        string
  actorEmail?:    string
  action:         string   // format: 'resource.verb' e.g. 'policy.approved'
  resourceType:   string
  resourceId?:    string
  metadata?:      Record<string, unknown>
  ipAddress?:     string
  userAgent?:     string
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  // Fire-and-forget: do not await this in request handlers
  // It must never block the main response
  prisma.auditLog.create({ data: entry }).catch(err => {
    console.error('AuditLog write failed:', err)
    // In production, send to Sentry as well
  })
}

// Standard action strings to use consistently:
// evidence.created   evidence.deleted   evidence.downloaded
// policy.created     policy.approved    policy.archived
// baa.created        baa.signed         baa.expired
// risk_assessment.created  risk_assessment.approved
// training.recorded
// integration.connected  integration.disconnected  integration.synced
// org.member_invited  org.member_removed
// security.unauthorized_access_attempt
