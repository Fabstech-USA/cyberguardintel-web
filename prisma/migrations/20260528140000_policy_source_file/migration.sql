-- Store original uploaded policy files (markdown, docx, pdf) in S3
ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "sourceS3Key" TEXT;
ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "sourceMimeType" TEXT;
ALTER TABLE "Policy" ADD COLUMN IF NOT EXISTS "sourceFileName" TEXT;
