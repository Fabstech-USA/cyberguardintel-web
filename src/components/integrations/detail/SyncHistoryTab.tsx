"use client";

import type { CollectionJobDto } from "@/lib/integration-detail";
import { formatDurationMs, formatRelativeShort } from "@/lib/integration-detail";
import { cn } from "@/lib/utils";

type SyncHistoryTabProps = {
  jobs: CollectionJobDto[];
};

function statusBadge(status: CollectionJobDto["status"]) {
  if (status === "COMPLETED") {
    return {
      label: "Success",
      className:
        "bg-emerald-500/12 text-emerald-800 dark:text-emerald-400",
    };
  }
  if (status === "FAILED") {
    return {
      label: "Error",
      className: "bg-red-500/10 text-red-700 dark:text-red-400",
    };
  }
  if (status === "RUNNING") {
    return {
      label: "Running",
      className: "bg-amber-500/12 text-amber-800 dark:text-amber-400",
    };
  }
  return {
    label: "Queued",
    className: "bg-muted text-muted-foreground",
  };
}

export function SyncHistoryTab({ jobs }: SyncHistoryTabProps) {
  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Sync history</h3>
        <p className="text-[11.5px] text-muted-foreground">
          Every collection job from the past 30 days. Each row corresponds to a
          CollectionJob record.
        </p>
      </div>

      {jobs.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No sync jobs yet. Click Sync now to collect evidence.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[100px_90px_minmax(0,1fr)_120px_80px] gap-3 bg-muted/40 px-3.5 py-2 text-[10.5px] font-medium text-muted-foreground">
              <div>When</div>
              <div>Type</div>
              <div>Details</div>
              <div>Evidence</div>
              <div>Duration</div>
            </div>
            {jobs.map((job) => {
              const badge = statusBadge(job.status);
              return (
                <div
                  key={job.id}
                  className="grid grid-cols-[100px_90px_minmax(0,1fr)_120px_80px] items-center gap-3 border-t px-3.5 py-2.5 text-xs"
                >
                  <div className="tabular-nums text-muted-foreground">
                    {formatRelativeShort(job.completedAt ?? job.createdAt)} ago
                  </div>
                  <div>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground">
                      {job.jobType}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                        badge.className
                      )}
                    >
                      {badge.label}
                    </span>
                    <p
                      className={cn(
                        "mt-1 truncate text-[11.5px]",
                        job.status === "FAILED"
                          ? "text-destructive"
                          : "text-muted-foreground"
                      )}
                    >
                      {job.errorMessage ??
                        (job.status === "COMPLETED"
                          ? `Collected ${job.evidenceAdded} evidence ${job.evidenceAdded === 1 ? "item" : "items"}`
                          : job.status === "RUNNING"
                            ? "Collection in progress…"
                            : "Waiting in queue")}
                    </p>
                  </div>
                  <div>
                    <strong className="text-[12.5px] tabular-nums">
                      {job.evidenceAdded}
                    </strong>
                    <span className="text-[10.5px] text-muted-foreground">
                      {" "}
                      items
                    </span>
                  </div>
                  <div className="tabular-nums text-muted-foreground">
                    {formatDurationMs(job.durationMs)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
