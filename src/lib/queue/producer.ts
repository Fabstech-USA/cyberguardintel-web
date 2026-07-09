import { Queue } from "bullmq";
import { IntegrationStatus } from "@/generated/prisma";
import { getRedisConnectionOptions } from "@/lib/queue/connection";
import {
  COLLECT_JOB_NAME,
  type CollectionJobPayload,
  type CollectionJobType,
  QUEUE_NAME,
} from "@/lib/queue/types";
import { prisma } from "@/lib/prisma";

let queue: Queue | null = null;

function getQueue(): Queue {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection: getRedisConnectionOptions(),
    });
  }
  return queue;
}

export type EnqueueCollectionJobInput = {
  organizationId: string;
  integrationId: string;
  jobType?: CollectionJobType;
};

export type EnqueueCollectionJobResult = {
  jobId: string;
  status: "QUEUED";
};

export async function enqueueCollectionJob(
  input: EnqueueCollectionJobInput
): Promise<EnqueueCollectionJobResult> {
  const jobType = input.jobType ?? "INCREMENTAL";

  const integration = await prisma.integration.findFirst({
    where: {
      id: input.integrationId,
      organizationId: input.organizationId,
    },
  });

  if (!integration) {
    throw new Error("Integration not found");
  }

  if (integration.status !== IntegrationStatus.ACTIVE) {
    throw new Error("Integration is not active");
  }

  const collectionJob = await prisma.collectionJob.create({
    data: {
      organizationId: input.organizationId,
      integrationId: input.integrationId,
      jobType,
      status: "QUEUED",
    },
  });

  const payload: CollectionJobPayload = {
    collectionJobId: collectionJob.id,
    organizationId: input.organizationId,
    integrationId: input.integrationId,
    jobType,
  };

  const bullJob = await getQueue().add(COLLECT_JOB_NAME, payload, {
    jobId: collectionJob.id,
  });

  await prisma.collectionJob.update({
    where: { id: collectionJob.id },
    data: { bullmqJobId: bullJob.id ?? collectionJob.id },
  });

  return { jobId: collectionJob.id, status: "QUEUED" };
}

/** Test-only: reset cached queue instance. */
export function resetQueueForTests(): void {
  queue = null;
}
