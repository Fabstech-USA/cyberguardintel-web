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
