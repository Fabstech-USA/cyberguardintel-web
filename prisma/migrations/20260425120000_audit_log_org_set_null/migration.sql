-- Preserve audit rows when an organization is deleted (HIPAA trail for org.deleted).
-- organizationId is cleared by FK on delete; metadata should retain clerkOrgId / slug.

ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_organizationId_fkey";

ALTER TABLE "AuditLog" ALTER COLUMN "organizationId" DROP NOT NULL;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
