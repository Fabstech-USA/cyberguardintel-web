import type { JobStatus } from "@/generated/prisma";

/** Daily cron: 02:00 UTC (`vercel.json`). */
export const INTEGRATION_SYNC_CRON_HOUR_UTC = 2;

const SENSITIVE_CONFIG_KEYS = new Set([
  "access_key_id",
  "secret_access_key",
  "api_key",
  "api_secret",
  "api_token",
  "access_token",
  "refresh_token",
  "client_secret",
  "password",
  "token",
  "encrypted",
  "private_key",
]);

export type SafeConfigEntry = {
  key: string;
  label: string;
  value: string;
};

export type SyncActivityDay = {
  date: string;
  evidenceAdded: number;
  failed: boolean;
};

export type ControlCoverageRow = {
  controlRef: string;
  title: string;
  count: number;
};

export type CollectionJobDto = {
  id: string;
  jobType: string;
  status: JobStatus;
  evidenceAdded: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  durationMs: number | null;
};

type JobForOverview = {
  status: JobStatus;
  evidenceAdded: number;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
};

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

export function getNextScheduledSyncAt(now = new Date()): Date {
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      INTEGRATION_SYNC_CRON_HOUR_UTC,
      0,
      0,
      0
    )
  );
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

export function computeSuccessRate(
  jobs: Array<{ status: JobStatus }>
): number | null {
  const finished = jobs.filter(
    (job) => job.status === "COMPLETED" || job.status === "FAILED"
  );
  if (finished.length === 0) return null;
  const completed = finished.filter((job) => job.status === "COMPLETED").length;
  return Math.round((completed / finished.length) * 100);
}

export function buildSyncActivityBars(
  jobs: JobForOverview[],
  now = new Date(),
  days = 14
): SyncActivityDay[] {
  const start = startOfUtcDay(now);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const byDay = new Map<string, { evidenceAdded: number; failed: boolean }>();
  for (let i = 0; i < days; i += 1) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    byDay.set(utcDayKey(day), { evidenceAdded: 0, failed: false });
  }

  for (const job of jobs) {
    const when = job.completedAt ?? job.startedAt ?? job.createdAt;
    const key = utcDayKey(when);
    const bucket = byDay.get(key);
    if (!bucket) continue;
    if (job.status === "FAILED") {
      bucket.failed = true;
    }
    if (job.status === "COMPLETED" || job.status === "FAILED") {
      bucket.evidenceAdded += job.evidenceAdded;
    }
  }

  return Array.from(byDay.entries()).map(([date, value]) => ({
    date,
    evidenceAdded: value.evidenceAdded,
    failed: value.failed,
  }));
}

export function jobDurationMs(
  startedAt: Date | null,
  completedAt: Date | null
): number | null {
  if (!startedAt || !completedAt) return null;
  const ms = completedAt.getTime() - startedAt.getTime();
  return ms >= 0 ? ms : null;
}

export function toCollectionJobDto(job: {
  id: string;
  jobType: string;
  status: JobStatus;
  evidenceAdded: number;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}): CollectionJobDto {
  return {
    id: job.id,
    jobType: job.jobType,
    status: job.status,
    evidenceAdded: job.evidenceAdded,
    errorMessage: job.errorMessage,
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    durationMs: jobDurationMs(job.startedAt, job.completedAt),
  };
}

function humanizeConfigKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function extractSafeConfig(
  config: unknown,
  credentialsPreview?: Record<string, unknown>
): SafeConfigEntry[] {
  const entries: SafeConfigEntry[] = [];
  const sources: Array<Record<string, unknown>> = [];

  if (config && typeof config === "object" && !Array.isArray(config)) {
    sources.push(config as Record<string, unknown>);
  }
  if (
    credentialsPreview &&
    typeof credentialsPreview === "object" &&
    !Array.isArray(credentialsPreview)
  ) {
    sources.push(credentialsPreview);
  }

  const seen = new Set<string>();
  for (const source of sources) {
    for (const [key, raw] of Object.entries(source)) {
      const lower = key.toLowerCase();
      if (SENSITIVE_CONFIG_KEYS.has(lower) || lower.includes("secret")) {
        continue;
      }
      if (
        lower === "fixture" ||
        lower === "profile" ||
        lower === "demo_profile"
      ) {
        continue;
      }
      if (seen.has(lower)) continue;
      if (typeof raw === "boolean" || typeof raw === "number") {
        seen.add(lower);
        entries.push({
          key,
          label: humanizeConfigKey(key),
          value: String(raw),
        });
        continue;
      }
      if (typeof raw !== "string" || !raw.trim()) continue;
      seen.add(lower);
      entries.push({
        key,
        label: humanizeConfigKey(key),
        value: raw,
      });
    }
  }

  return entries;
}

export function formatDurationMs(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  return rem === 0 ? `${minutes}m` : `${minutes}m ${rem}s`;
}

export function formatRelativeShort(iso: string | null, now = new Date()): string {
  if (!iso) return "Never";
  const ms = now.getTime() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/** Pure relative countdown; pass `now` from the caller (avoid Date.now in render). */
export function formatTimeUntil(iso: string, now: Date): string {
  const ms = new Date(iso).getTime() - now.getTime();
  if (ms <= 0) return "soon";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function canConfirmDisconnect(text: string): boolean {
  return text === "DISCONNECT";
}
