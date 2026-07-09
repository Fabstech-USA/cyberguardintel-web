-- Allow disconnecting integrations that have collection history.
-- Jobs are disposable sync records; evidence is preserved via Evidence.integrationId SET NULL.
ALTER TABLE "CollectionJob" DROP CONSTRAINT "CollectionJob_integrationId_fkey";

ALTER TABLE "CollectionJob" ADD CONSTRAINT "CollectionJob_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
