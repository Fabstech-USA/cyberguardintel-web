-- Baseline: create migrations tracking table
CREATE TABLE "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
);

-- ===== Migration: 20260407120000_init =====
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- pgvector (required for FrameworkControl.embedding)
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('STARTER', 'GROWTH', 'BUSINESS', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'AUDITOR');

-- CreateEnum
CREATE TYPE "Industry" AS ENUM ('HEALTHCARE', 'TECHNOLOGY', 'FINANCE', 'ECOMMERCE', 'OTHER');

-- CreateEnum
CREATE TYPE "FrameworkSlug" AS ENUM ('HIPAA', 'SOC2', 'PCI_DSS', 'ISO27001', 'CMMC');

-- CreateEnum
CREATE TYPE "FrameworkStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'AUDIT_READY', 'CERTIFIED');

-- CreateEnum
CREATE TYPE "ControlStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'IMPLEMENTED', 'NEEDS_REVIEW', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "EvidenceSource" AS ENUM ('INTEGRATION', 'MANUAL', 'AI_GENERATED');

-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('ACCESS_CONTROL', 'INCIDENT_RESPONSE', 'WORKFORCE_TRAINING', 'DEVICE_MEDIA', 'CONTINGENCY_PLAN', 'AUDIT_CONTROLS', 'TRANSMISSION_SECURITY', 'FACILITY_ACCESS', 'WORKSTATION_USE', 'INFORMATION_ACCESS', 'DATA_CLASSIFICATION', 'VENDOR_MANAGEMENT');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BaaStatus" AS ENUM ('PENDING', 'SIGNED', 'EXPIRED', 'TERMINATED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "clerkOrgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL DEFAULT 'STARTER',
    "billingEmail" TEXT NOT NULL,
    "industry" "Industry" NOT NULL DEFAULT 'HEALTHCARE',
    "employeeCount" INTEGER,
    "hipaaSubjectType" TEXT,
    "techStack" TEXT[],
    "stripeCustomerId" TEXT,
    "stripeSubId" TEXT,
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgMember" (
    "id" TEXT NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Framework" (
    "id" TEXT NOT NULL,
    "slug" "FrameworkSlug" NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Framework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrameworkControl" (
    "id" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "controlRef" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "guidance" TEXT NOT NULL,
    "evidenceHints" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "embedding" vector(384),

    CONSTRAINT "FrameworkControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlMapping" (
    "id" TEXT NOT NULL,
    "sourceControlId" TEXT NOT NULL,
    "targetControlId" TEXT NOT NULL,
    "mappingStrength" TEXT NOT NULL DEFAULT 'partial',

    CONSTRAINT "ControlMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgFramework" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "status" "FrameworkStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "targetAuditDate" TIMESTAMP(3),
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "scoreUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgFramework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgControl" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "frameworkControlId" TEXT NOT NULL,
    "status" "ControlStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "ownerId" TEXT,
    "implementationNotes" TEXT,
    "dueDate" TIMESTAMP(3),
    "lastReviewedAt" TIMESTAMP(3),
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orgControlId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" "EvidenceSource" NOT NULL,
    "integrationId" TEXT,
    "s3Key" TEXT,
    "mimeType" TEXT,
    "fileHash" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "metadata" JSONB,
    "isValid" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "frameworkSlug" "FrameworkSlug" NOT NULL,
    "type" "PolicyType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "effectiveDate" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "conductedById" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "scope" TEXT NOT NULL,
    "threats" JSONB NOT NULL,
    "vulnerabilities" JSONB NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "recommendations" JSONB NOT NULL,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaaRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vendorName" TEXT NOT NULL,
    "vendorEmail" TEXT,
    "services" TEXT NOT NULL,
    "status" "BaaStatus" NOT NULL DEFAULT 'PENDING',
    "signedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "documentS3Key" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaaRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "employeeEmail" TEXT NOT NULL,
    "trainingTitle" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "nextDueAt" TIMESTAMP(3) NOT NULL,
    "attestationS3Key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhiSystem" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "systemType" TEXT NOT NULL,
    "description" TEXT,
    "containsPhi" BOOLEAN NOT NULL DEFAULT true,
    "phiTypes" TEXT[],
    "accessControls" TEXT,
    "encryptionAtRest" BOOLEAN NOT NULL DEFAULT false,
    "encryptionInTransit" BOOLEAN NOT NULL DEFAULT false,
    "connections" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhiSystem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE',
    "encryptedCreds" TEXT NOT NULL,
    "config" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL DEFAULT 'INCREMENTAL',
    "bullmqJobId" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "evidenceAdded" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_clerkOrgId_key" ON "Organization"("clerkOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeSubId_key" ON "Organization"("stripeSubId");

-- CreateIndex
CREATE INDEX "OrgMember_organizationId_idx" ON "OrgMember"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgMember_clerkUserId_organizationId_key" ON "OrgMember"("clerkUserId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Framework_slug_key" ON "Framework"("slug");

-- CreateIndex
CREATE INDEX "FrameworkControl_frameworkId_idx" ON "FrameworkControl"("frameworkId");

-- CreateIndex
CREATE UNIQUE INDEX "FrameworkControl_frameworkId_controlRef_key" ON "FrameworkControl"("frameworkId", "controlRef");

-- CreateIndex
CREATE UNIQUE INDEX "ControlMapping_sourceControlId_targetControlId_key" ON "ControlMapping"("sourceControlId", "targetControlId");

-- CreateIndex
CREATE INDEX "OrgFramework_organizationId_idx" ON "OrgFramework"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgFramework_organizationId_frameworkId_key" ON "OrgFramework"("organizationId", "frameworkId");

-- CreateIndex
CREATE INDEX "OrgControl_organizationId_idx" ON "OrgControl"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrgControl_organizationId_frameworkControlId_key" ON "OrgControl"("organizationId", "frameworkControlId");

-- CreateIndex
CREATE INDEX "Evidence_organizationId_orgControlId_idx" ON "Evidence"("organizationId", "orgControlId");

-- CreateIndex
CREATE INDEX "Evidence_organizationId_collectedAt_idx" ON "Evidence"("organizationId", "collectedAt");

-- CreateIndex
CREATE INDEX "Policy_organizationId_frameworkSlug_idx" ON "Policy"("organizationId", "frameworkSlug");

-- CreateIndex
CREATE UNIQUE INDEX "Policy_organizationId_frameworkSlug_type_key" ON "Policy"("organizationId", "frameworkSlug", "type");

-- CreateIndex
CREATE INDEX "RiskAssessment_organizationId_idx" ON "RiskAssessment"("organizationId");

-- CreateIndex
CREATE INDEX "BaaRecord_organizationId_status_idx" ON "BaaRecord"("organizationId", "status");

-- CreateIndex
CREATE INDEX "TrainingRecord_organizationId_nextDueAt_idx" ON "TrainingRecord"("organizationId", "nextDueAt");

-- CreateIndex
CREATE INDEX "PhiSystem_organizationId_idx" ON "PhiSystem"("organizationId");

-- CreateIndex
CREATE INDEX "Integration_organizationId_idx" ON "Integration"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Integration_organizationId_type_key" ON "Integration"("organizationId", "type");

-- CreateIndex
CREATE INDEX "CollectionJob_organizationId_status_idx" ON "CollectionJob"("organizationId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_resourceType_resourceId_idx" ON "AuditLog"("organizationId", "resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "OrgMember" ADD CONSTRAINT "OrgMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FrameworkControl" ADD CONSTRAINT "FrameworkControl_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "Framework"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlMapping" ADD CONSTRAINT "ControlMapping_sourceControlId_fkey" FOREIGN KEY ("sourceControlId") REFERENCES "FrameworkControl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlMapping" ADD CONSTRAINT "ControlMapping_targetControlId_fkey" FOREIGN KEY ("targetControlId") REFERENCES "FrameworkControl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgFramework" ADD CONSTRAINT "OrgFramework_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgFramework" ADD CONSTRAINT "OrgFramework_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "Framework"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgControl" ADD CONSTRAINT "OrgControl_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrgControl" ADD CONSTRAINT "OrgControl_frameworkControlId_fkey" FOREIGN KEY ("frameworkControlId") REFERENCES "FrameworkControl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_orgControlId_fkey" FOREIGN KEY ("orgControlId") REFERENCES "OrgControl"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaaRecord" ADD CONSTRAINT "BaaRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRecord" ADD CONSTRAINT "TrainingRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhiSystem" ADD CONSTRAINT "PhiSystem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionJob" ADD CONSTRAINT "CollectionJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionJob" ADD CONSTRAINT "CollectionJob_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===== Migration: 20260415205347_add_onboarding_step =====
-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "onboardingStep" INTEGER DEFAULT 0;

-- ===== Migration: 20260419195438_add_plan_period =====
-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'ANNUAL');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "planPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY';

-- ===== Migration: 20260419210555_add_org_member_job_title =====
-- AlterTable
ALTER TABLE "OrgMember" ADD COLUMN     "jobTitle" TEXT;

-- ===== Migration: 20260425120000_audit_log_org_set_null =====
-- Preserve audit rows when an organization is deleted (HIPAA trail for org.deleted).
-- organizationId is cleared by FK on delete; metadata should retain clerkOrgId / slug.

ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_organizationId_fkey";

ALTER TABLE "AuditLog" ALTER COLUMN "organizationId" DROP NOT NULL;

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== Migration: 20260509120000_phi_flow_map =====
-- CreateEnum
CREATE TYPE "PhiFlowDataClassification" AS ENUM ('PHI', 'DE_IDENTIFIED');

-- AlterTable
ALTER TABLE "PhiSystem" ADD COLUMN     "phiCreates" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phiTransmits" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phiStores" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phiDestroys" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "baaRecordId" TEXT;

-- CreateTable
CREATE TABLE "PhiFlowEdge" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourcePhiSystemId" TEXT NOT NULL,
    "targetPhiSystemId" TEXT,
    "targetIntegrationId" TEXT,
    "viaIntegrationId" TEXT,
    "baaRecordId" TEXT,
    "isExternalVendorFlow" BOOLEAN NOT NULL DEFAULT false,
    "dataClassification" "PhiFlowDataClassification" NOT NULL DEFAULT 'PHI',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhiFlowEdge_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PhiFlowEdge_target_xor" CHECK (
        ("targetPhiSystemId" IS NOT NULL AND "targetIntegrationId" IS NULL)
        OR ("targetPhiSystemId" IS NULL AND "targetIntegrationId" IS NOT NULL)
    )
);

-- CreateIndex
CREATE INDEX "PhiFlowEdge_organizationId_idx" ON "PhiFlowEdge"("organizationId");
CREATE INDEX "PhiFlowEdge_sourcePhiSystemId_idx" ON "PhiFlowEdge"("sourcePhiSystemId");
CREATE INDEX "PhiFlowEdge_targetPhiSystemId_idx" ON "PhiFlowEdge"("targetPhiSystemId");
CREATE INDEX "PhiFlowEdge_targetIntegrationId_idx" ON "PhiFlowEdge"("targetIntegrationId");
CREATE INDEX "PhiSystem_baaRecordId_idx" ON "PhiSystem"("baaRecordId");

-- AddForeignKey
ALTER TABLE "PhiSystem" ADD CONSTRAINT "PhiSystem_baaRecordId_fkey" FOREIGN KEY ("baaRecordId") REFERENCES "BaaRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PhiFlowEdge" ADD CONSTRAINT "PhiFlowEdge_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhiFlowEdge" ADD CONSTRAINT "PhiFlowEdge_sourcePhiSystemId_fkey" FOREIGN KEY ("sourcePhiSystemId") REFERENCES "PhiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhiFlowEdge" ADD CONSTRAINT "PhiFlowEdge_targetPhiSystemId_fkey" FOREIGN KEY ("targetPhiSystemId") REFERENCES "PhiSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhiFlowEdge" ADD CONSTRAINT "PhiFlowEdge_targetIntegrationId_fkey" FOREIGN KEY ("targetIntegrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PhiFlowEdge" ADD CONSTRAINT "PhiFlowEdge_viaIntegrationId_fkey" FOREIGN KEY ("viaIntegrationId") REFERENCES "Integration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PhiFlowEdge" ADD CONSTRAINT "PhiFlowEdge_baaRecordId_fkey" FOREIGN KEY ("baaRecordId") REFERENCES "BaaRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ===== Migration: 20260512132000_add_baa_not_required =====
-- AlterEnum
ALTER TYPE "BaaStatus" ADD VALUE IF NOT EXISTS 'NOT_REQUIRED';

-- ===== Migration: 20260520031810_add_policy_version_snapshots =====
-- CreateTable
CREATE TABLE "PolicyVersion" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "approvedById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PolicyVersion_policyId_approvedAt_idx" ON "PolicyVersion"("policyId", "approvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyVersion_policyId_version_key" ON "PolicyVersion"("policyId", "version");

-- AddForeignKey
ALTER TABLE "PolicyVersion" ADD CONSTRAINT "PolicyVersion_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill approved snapshots for policies approved before this migration
INSERT INTO "PolicyVersion" ("id", "policyId", "version", "title", "content", "approvedById", "approvedAt", "createdAt")
SELECT
  'pv_' || "id" || '_' || "version"::text,
  "id",
  "version",
  "title",
  "content",
  "approvedById",
  "approvedAt",
  COALESCE("approvedAt", NOW())
FROM "Policy"
WHERE "status" = 'APPROVED'
  AND "approvedById" IS NOT NULL
  AND "approvedAt" IS NOT NULL
ON CONFLICT ("policyId", "version") DO NOTHING;

-- ===== Migration: 20260520120000_training_record_job_title =====
-- AlterTable
ALTER TABLE "TrainingRecord" ADD COLUMN "employeeJobTitle" TEXT;

-- ===== Migration: 20260524120000_baa_draft_review_pdf =====
-- CreateEnum
CREATE TYPE "BaaDraftReviewStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'READY_FOR_SIGNATURE');

-- AlterTable
ALTER TABLE "BaaRecord" ADD COLUMN     "draftTitle" TEXT,
ADD COLUMN     "draftMarkdown" TEXT,
ADD COLUMN     "draftReviewStatus" "BaaDraftReviewStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "draftPdfS3Key" TEXT,
ADD COLUMN     "draftUpdatedAt" TIMESTAMP(3);

-- ===== Migration: 20260528120000_expand_policy_type_enum =====
-- Expand PolicyType to 18 HIPAA Security Rule policies (CGI standard set)
ALTER TYPE "PolicyType" ADD VALUE IF NOT EXISTS 'SECURITY_MANAGEMENT_PROCESS';
ALTER TYPE "PolicyType" ADD VALUE IF NOT EXISTS 'ASSIGNED_SECURITY_RESPONSIBILITY';
ALTER TYPE "PolicyType" ADD VALUE IF NOT EXISTS 'WORKFORCE_SECURITY';
ALTER TYPE "PolicyType" ADD VALUE IF NOT EXISTS 'PERIODIC_EVALUATION';
ALTER TYPE "PolicyType" ADD VALUE IF NOT EXISTS 'PERSON_ENTITY_AUTHENTICATION';
ALTER TYPE "PolicyType" ADD VALUE IF NOT EXISTS 'POLICIES_PROCEDURES_DOCUMENTATION';

-- ===== Migration: 20260528140000_policy_source_file =====
-- Store original uploaded policy files (markdown, docx, pdf) in S3
ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "sourceS3Key" TEXT;
ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "sourceMimeType" TEXT;
ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "sourceFileName" TEXT;

-- ===== Migration: 20260709160000_collection_job_integration_cascade =====
-- Allow disconnecting integrations that have collection history.
-- Jobs are disposable sync records; evidence is preserved via Evidence.integrationId SET NULL.
ALTER TABLE "CollectionJob" DROP CONSTRAINT "CollectionJob_integrationId_fkey";

ALTER TABLE "CollectionJob" ADD CONSTRAINT "CollectionJob_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===== Migration: 20260713010000_audit_export_job =====
-- CreateTable
CREATE TABLE "AuditExportJob" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "bullmqJobId" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "fromDate" TIMESTAMP(3) NOT NULL,
    "toDate" TIMESTAMP(3) NOT NULL,
    "controlRefs" TEXT[],
    "s3Key" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditExportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditExportJob_organizationId_status_idx" ON "AuditExportJob"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "AuditExportJob" ADD CONSTRAINT "AuditExportJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===== Migration: 20260713020000_audit_export_progress =====
-- AlterTable
ALTER TABLE "AuditExportJob" ADD COLUMN IF NOT EXISTS "sections" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "AuditExportJob" ADD COLUMN IF NOT EXISTS "progressSteps" JSONB;
ALTER TABLE "AuditExportJob" ADD COLUMN IF NOT EXISTS "currentStep" TEXT;

-- ===== Migration: 20260713030000_org_session_timeout =====
-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 30;

-- Record all migrations as applied
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('aa336018-a966-44cf-bbc1-67e15e6a4ebe', '41a307048e779026968dde1bcb7f12c725147862405526b852ecfc9f8719cd40', now(), '20260407120000_init', NULL, NULL, now(), 1);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('7d5d1323-9199-4cfa-98d1-16512246ae6b', 'c325e7be3172c61fe6eb1c70bde9ce3c6b11ae504fd719daa5f99b2f86ff814b', now(), '20260415205347_add_onboarding_step', NULL, NULL, now(), 1);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('310888d1-1271-4db5-9c62-3f1447a007db', '4b2b88ae536e3657fd5b204942cfafb97457965f01b4e4c2f4a6c06195c7bfaa', now(), '20260419195438_add_plan_period', NULL, NULL, now(), 1);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('b21d85a2-072f-447c-a222-eb4c90f41016', 'd91791f62c1e64d2ecb506cbafa3b681faf1d62ddc1d0b861ec11a737a3a3024', now(), '20260419210555_add_org_member_job_title', NULL, NULL, now(), 1);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('8d3fe943-a07b-4a9f-9897-8e0c54acebd5', '9425d69c328f75d7225e42844210fa3eff8f738d7116d3811a614ab91b2329e5', now(), '20260425120000_audit_log_org_set_null', NULL, NULL, now(), 1);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('3d1079d3-2208-49e2-89f9-7fdf1aa0e984', '957b4c6ae66ab059e36267db816775d5aa4b00f7490a33e10c244b06d0d87f2a', now(), '20260509120000_phi_flow_map', NULL, NULL, now(), 1);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('98454560-2bf9-438c-b5ac-ecc01bc8ab9f', '69327c6da94911c6b90985b61733438874d6ec6cbc4f9f3f58ddb7e3376a5e9b', now(), '20260512132000_add_baa_not_required', NULL, NULL, now(), 1);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('c8131e88-5829-4a7c-9ea7-1e9521b334f5', 'f5295904bac8231c5132a8b2c620dc71f3df67725653ca2403e5c347c8faa441', now(), '20260520031810_add_policy_version_snapshots', NULL, NULL, now(), 1);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('0ce15991-e1cc-4d89-98bb-35ef1b09723d', '598e04841747086b3fd85450855589c971bfb06631e6b1333d3581ec55ef6ca4', now(), '20260520120000_training_record_job_title', NULL, NULL, now(), 1);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('a9df410a-95c4-4a03-a7f4-012c1af7aa38', 'd91fc0a38ced8ecffa68671e6cb964e288e21d21c8dfab6df2c7ca0803f42c2e', now(), '20260524120000_baa_draft_review_pdf', NULL, NULL, now(), 1);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('5a4393c8-2854-4410-a230-654248f3d6ea', '2265586f7a14430f39a4eb5693e7c44bfddb0c5fd6637b448f29a591ae8a36cd', now(), '20260528120000_expand_policy_type_enum', NULL, NULL, now(), 1);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('0183b631-941f-4cc5-9267-0abc131cd210', '27f734bd843eb0a5461b0acb909fc2850de00fbb4881ec797916ec351fc9d353', now(), '20260528140000_policy_source_file', NULL, NULL, now(), 1);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('c58eadd9-40eb-4511-8434-83f543203ca5', '9320fe38fa916e263cbdb097d64c6a178492e9ef0c237928e1e19a0f1910b1a4', now(), '20260709160000_collection_job_integration_cascade', NULL, NULL, now(), 1);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('e38cb7a1-5042-4a05-9f5c-9f6cf73786b1', '929c8f09e8c43312fab3ddb62463df7699e960591c7d5d4cd8849bf582db3cbc', now(), '20260713010000_audit_export_job', NULL, NULL, now(), 1);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('6453ce0a-5c1d-45b3-8021-1e9f795f5ea4', 'fc3458bb6d0e165fc81612ad57dada1991497dcb56dafe1130d520d1eeae286f', now(), '20260713020000_audit_export_progress', NULL, NULL, now(), 1);
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('23f6f5e7-2508-4f7e-9d7e-7a7ddf068a65', 'b37a78a05846173600022c6814414b25b97880ba15633dab5cd0f4c394034df3', now(), '20260713030000_org_session_timeout', NULL, NULL, now(), 1);
