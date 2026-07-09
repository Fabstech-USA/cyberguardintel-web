"use client";

import { useState } from "react";

import type { IntegrationOverviewDto } from "@/lib/integration-detail-queries";
import {
  formatRelativeShort,
  formatTimeUntil,
} from "@/lib/integration-detail";
import { cn } from "@/lib/utils";

type OverviewTabProps = {
  overview: IntegrationOverviewDto;
};

export function OverviewTab({ overview }: OverviewTabProps) {
  const [now] = useState(() => new Date());
  const max = Math.max(
    1,
    ...overview.activity.map((day) => day.evidenceAdded)
  );
  const nextLabel = formatTimeUntil(overview.nextSyncAt, now);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Evidence items",
            value: String(overview.evidenceCount),
            meta: "Valid items",
          },
          {
            label: "Last sync",
            value: formatRelativeShort(overview.lastSyncAt, now),
            meta: `Next: ${nextLabel}`,
          },
          {
            label: "Success rate",
            value:
              overview.successRate == null ? "—" : `${overview.successRate}%`,
            meta: "Last 14 days",
          },
          {
            label: "Controls covered",
            value: String(overview.controlsCovered),
            meta: "HIPAA Technical",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border bg-card px-4 py-3 shadow-sm"
          >
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
              {stat.value}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{stat.meta}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3">
          <h3 className="text-sm font-semibold">Sync activity</h3>
          <p className="text-[11.5px] text-muted-foreground">
            Evidence collected per daily sync, trailing 14 days. Red bars
            indicate failed syncs.
          </p>
        </div>
        <div className="flex h-[60px] items-end gap-0.5">
          {overview.activity.map((day) => {
            const height = Math.max(2, (day.evidenceAdded / max) * 58);
            return (
              <div
                key={day.date}
                title={`${day.date}: ${day.evidenceAdded} items${day.failed ? " (failed)" : ""}`}
                className={cn(
                  "min-h-0.5 flex-1 rounded-t-sm",
                  day.failed ? "bg-red-500" : "bg-emerald-600/80"
                )}
                style={{ height }}
              />
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>14d ago</span>
          <span>7d</span>
          <span>Today</span>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3">
          <h3 className="text-sm font-semibold">HIPAA control coverage</h3>
          <p className="text-[11.5px] text-muted-foreground">
            Which HIPAA Security Rule controls this integration satisfies.
          </p>
        </div>
        {overview.controlCoverage.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No evidence collected yet. Run a sync to populate control coverage.
          </p>
        ) : (
          <div>
            {overview.controlCoverage.map((row) => (
              <div
                key={row.controlRef}
                className="grid grid-cols-[110px_minmax(0,1fr)_60px] items-center gap-3 border-b py-2 text-xs last:border-b-0"
              >
                <div className="font-mono text-[11px] text-muted-foreground">
                  {row.controlRef}
                </div>
                <div className="truncate">{row.title}</div>
                <div className="text-right text-[11px] tabular-nums">
                  <strong className="font-medium text-emerald-800 dark:text-emerald-400">
                    {row.count} {row.count === 1 ? "item" : "items"}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
