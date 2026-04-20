-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'ANNUAL');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "planPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY';
