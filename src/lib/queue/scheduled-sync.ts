import { IntegrationStatus } from "@/generated/prisma";
import { enqueueCollectionJob } from "@/lib/queue/producer";
import { prisma } from "@/lib/prisma";

export type ScheduledSyncFailure = {
  integrationId: string;
  organizationId: string;
  error: string;
};

export type ScheduledSyncResult = {
  scanned: number;
  enqueued: number;
  failed: number;
  failures: ScheduledSyncFailure[];
};

async function markEnqueueFailure(params: {
  integrationId: string;
  organizationId: string;
  errorMessage: string;
}): Promise<void> {
  await prisma.integration.update({
    where: { id: params.integrationId },
    data: { errorMessage: params.errorMessage },
  });

  await prisma.collectionJob.updateMany({
    where: {
      integrationId: params.integrationId,
      organizationId: params.organizationId,
      status: "QUEUED",
      bullmqJobId: null,
    },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      errorMessage: params.errorMessage,
    },
  });
}

export async function enqueueScheduledIntegrationSyncs(): Promise<ScheduledSyncResult> {
  const integrations = await prisma.integration.findMany({
    where: { status: IntegrationStatus.ACTIVE },
    select: { id: true, organizationId: true, type: true },
  });

  let enqueued = 0;
  const failures: ScheduledSyncFailure[] = [];

  for (const integration of integrations) {
    try {
      await enqueueCollectionJob({
        organizationId: integration.organizationId,
        integrationId: integration.id,
        jobType: "INCREMENTAL",
      });
      enqueued += 1;
    } catch (err) {
      const error =
        err instanceof Error ? err.message : "Failed to enqueue collection job";

      try {
        await markEnqueueFailure({
          integrationId: integration.id,
          organizationId: integration.organizationId,
          errorMessage: error,
        });
      } catch {
        // Best-effort error surfacing; still record failure in response.
      }

      failures.push({
        integrationId: integration.id,
        organizationId: integration.organizationId,
        error,
      });
    }
  }

  return {
    scanned: integrations.length,
    enqueued,
    failed: failures.length,
    failures,
  };
}
