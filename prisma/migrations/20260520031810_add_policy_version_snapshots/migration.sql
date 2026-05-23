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
