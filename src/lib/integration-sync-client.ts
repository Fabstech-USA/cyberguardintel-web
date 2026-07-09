import type { IntegrationPublicDto } from "@/lib/integration-api";

export type SyncJobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";

export type SyncJobPollResponse = {
  job: {
    id: string;
    status: SyncJobStatus;
    evidenceAdded: number;
    errorMessage: string | null;
    completedAt: string | null;
  };
  integration: IntegrationPublicDto | null;
};

export type SyncEnqueueResponse = {
  jobId: string;
  status: "QUEUED";
};

export type SyncPollResult =
  | {
      ok: true;
      job: SyncJobPollResponse["job"];
      integration: IntegrationPublicDto | null;
    }
  | {
      ok: false;
      job: SyncJobPollResponse["job"];
      integration: IntegrationPublicDto | null;
      message: string;
    };

const POLL_INTERVAL_MS = 1_000;
const MAX_POLL_MS = 120_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchIntegrations(): Promise<IntegrationPublicDto[]> {
  const response = await fetch("/api/integrations", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to refresh integrations");
  }
  const body = (await response.json()) as { integrations: IntegrationPublicDto[] };
  return body.integrations;
}

export async function enqueueIntegrationSync(
  integrationId: string,
  jobType: "FULL" | "INCREMENTAL" = "INCREMENTAL"
): Promise<SyncEnqueueResponse> {
  const response = await fetch(`/api/integrations/sync/${integrationId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobType }),
  });

  const body = (await response.json()) as SyncEnqueueResponse & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? "Failed to start sync");
  }

  return body;
}

export async function fetchSyncJob(jobId: string): Promise<SyncJobPollResponse> {
  const response = await fetch(`/api/integrations/sync/jobs/${jobId}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Failed to check sync status");
  }
  return response.json() as Promise<SyncJobPollResponse>;
}

export async function pollSyncJob(jobId: string): Promise<SyncPollResult> {
  const started = Date.now();

  while (Date.now() - started < MAX_POLL_MS) {
    const result = await fetchSyncJob(jobId);

    if (result.job.status === "COMPLETED") {
      return { ok: true, job: result.job, integration: result.integration };
    }

    if (result.job.status === "FAILED") {
      return {
        ok: false,
        job: result.job,
        integration: result.integration,
        message: result.job.errorMessage ?? "Sync failed",
      };
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error("Sync timed out — check back in a moment");
}

export function formatSyncSuccessMessage(
  integration: IntegrationPublicDto | null,
  evidenceAdded: number
): string {
  const name = integration?.displayName ?? "Integration";
  if (evidenceAdded > 0) {
    const noun = evidenceAdded === 1 ? "item" : "items";
    return `${name} synced — ${evidenceAdded} new evidence ${noun} collected.`;
  }
  if (integration?.lastSyncStatus === "partial") {
    return `${name} synced — evidence is already up to date.`;
  }
  return `${name} synced successfully.`;
}
