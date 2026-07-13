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
