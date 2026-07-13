import "@/lib/load-env";

import { Worker } from "bullmq";

import { processAuditExportJob } from "@/lib/queue/audit-export-processor";
import { getRedisConnectionOptions } from "@/lib/queue/connection";
import { processCollectionJob } from "@/lib/queue/processor";
import {
  AUDIT_EXPORT_QUEUE_NAME,
  QUEUE_NAME,
  type AuditExportJobPayload,
  type CollectionJobPayload,
} from "@/lib/queue/types";

const connection = getRedisConnectionOptions();

const collectionWorker = new Worker<CollectionJobPayload>(
  QUEUE_NAME,
  async (job) => processCollectionJob(job.data),
  {
    connection,
    concurrency: 2,
  }
);

const auditExportWorker = new Worker<AuditExportJobPayload>(
  AUDIT_EXPORT_QUEUE_NAME,
  async (job) => processAuditExportJob(job.data),
  {
    connection,
    concurrency: 2,
  }
);

collectionWorker.on("completed", (job, result) => {
  console.log(
    `[worker] Collection job ${job.id} completed:`,
    result?.status ?? "done",
    `evidenceAdded=${result?.evidenceAdded ?? 0}`
  );
});

collectionWorker.on("failed", (job, err) => {
  console.error(`[worker] Collection job ${job?.id} failed:`, err.message);
});

auditExportWorker.on("completed", (job, result) => {
  console.log(
    `[worker] Audit export job ${job.id} completed:`,
    result?.status ?? "done",
    result?.s3Key ? `s3Key=${result.s3Key}` : ""
  );
});

auditExportWorker.on("failed", (job, err) => {
  console.error(`[worker] Audit export job ${job?.id} failed:`, err.message);
});

console.log(
  `Workers listening on queues "${QUEUE_NAME}" and "${AUDIT_EXPORT_QUEUE_NAME}"`
);

async function shutdown(): Promise<void> {
  await Promise.all([collectionWorker.close(), auditExportWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
