-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

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

