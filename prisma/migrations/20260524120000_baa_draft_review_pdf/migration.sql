-- CreateEnum
CREATE TYPE "BaaDraftReviewStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'READY_FOR_SIGNATURE');

-- AlterTable
ALTER TABLE "BaaRecord" ADD COLUMN     "draftTitle" TEXT,
ADD COLUMN     "draftMarkdown" TEXT,
ADD COLUMN     "draftReviewStatus" "BaaDraftReviewStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "draftPdfS3Key" TEXT,
ADD COLUMN     "draftUpdatedAt" TIMESTAMP(3);
