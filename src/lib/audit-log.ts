export type AuditLogEntry = {
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(_entry: AuditLogEntry) {
  throw new Error("Not implemented");
}

