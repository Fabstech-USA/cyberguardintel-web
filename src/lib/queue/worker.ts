import "@/lib/load-env";

import { Worker } from "bullmq";

import { getRedisConnectionOptions } from "@/lib/queue/connection";
import { processCollectionJob } from "@/lib/queue/processor";
import { type CollectionJobPayload, QUEUE_NAME } from "@/lib/queue/types";

const worker = new Worker<CollectionJobPayload>(
  QUEUE_NAME,
  async (job) => processCollectionJob(job.data),
  {
    connection: getRedisConnectionOptions(),
    concurrency: 2,
  }
);

worker.on("completed", (job, result) => {
  console.log(
    `[worker] Job ${job.id} completed:`,
    result?.status ?? "done",
    `evidenceAdded=${result?.evidenceAdded ?? 0}`
  );
});

worker.on("failed", (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err.message);
});

console.log(`Evidence collection worker listening on queue "${QUEUE_NAME}"`);

process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});
