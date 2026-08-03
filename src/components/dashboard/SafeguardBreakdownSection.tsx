"use client";

import Link from "next/link";
import { HelpTip } from "@/components/shared/HelpTip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  SafeguardBucket,
  SafeguardBucketSummary,
  SafeguardFactorStat,
  SafeguardStatusMix,
} from "@/lib/dashboard-safeguards";

type Props = {
  summaries: SafeguardBucketSummary[];
};

const BUCKET_HELP: Record<SafeguardBucket, string> = {
  Administrative:
    "People and process controls: policies, training, risk analysis, and workforce access procedures.",
  Physical:
    "Facility and device protections: locked areas, workstation security, and media disposal.",
  Technical:
    "IT controls: access control, encryption, audit logs, and transmission security.",
  Organizational:
    "Business-associate and vendor arrangements that keep PHI protected across partners.",
};

function ringColor(score: number): string {
  if (score < 40) return "text-destructive";
  if (score <= 70) return "text-amber-600 dark:text-amber-500";
  return "text-emerald-600 dark:text-emerald-500";
}

function FactorBar({ factor }: { factor: SafeguardFactorStat }): React.JSX.Element {
  const total = factor.available + factor.missing;
  const availablePct = total === 0 ? 0 : (factor.available / total) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="font-medium text-foreground">{factor.label}</span>
        <span className="tabular-nums text-muted-foreground">
          {factor.available}/{total} {factor.unit}
        </span>
      </div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/80">
        {total === 0 ? (
          <div className="h-full w-full bg-muted" />
        ) : (
          <>
            <div
              className="h-full bg-emerald-500/80 transition-[width]"
              style={{ width: `${availablePct}%` }}
            />
            <div
              className="h-full bg-destructive/50 transition-[width]"
              style={{ width: `${100 - availablePct}%` }}
            />
          </>
        )}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{factor.available} available</span>
        <span>{factor.missing} missing</span>
      </div>
    </div>
  );
}

function StatusMixLine({ mix }: { mix: SafeguardStatusMix }): React.JSX.Element {
  const parts = [
    { label: "Implemented", count: mix.implemented },
    { label: "In progress", count: mix.inProgress },
    { label: "Needs review", count: mix.needsReview },
    { label: "Exception", count: mix.exception },
    { label: "Not started", count: mix.notStarted },
  ].filter((p) => p.count > 0);

  if (parts.length === 0) {
    return (
      <p className="text-[11px] text-muted-foreground">No status recorded yet.</p>
    );
  }

  return (
    <p className="text-[11px] leading-snug text-muted-foreground">
      Status:{" "}
      {parts.map((p, i) => (
        <span key={p.label}>
          {i > 0 ? " · " : ""}
          <span className="tabular-nums text-foreground">{p.count}</span>{" "}
          {p.label.toLowerCase()}
        </span>
      ))}
    </p>
  );
}

function SafeguardRing({
  summary,
}: {
  summary: SafeguardBucketSummary;
}): React.JSX.Element {
  const { bucket, score, controlCount, factors, statusMix } = summary;
  const rounded = Math.min(100, Math.max(0, Math.round(score)));
  const size = 96;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const normalizedR = r - stroke / 2;
  const c = 2 * Math.PI * normalizedR;
  const dash = (rounded / 100) * c;
  const center = size / 2;
  const href = `/hipaa/controls?safeguard=${encodeURIComponent(bucket)}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          className="group flex flex-col items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`View ${bucket} controls. Score ${rounded} of 100.`}
        >
          <div
            className="relative flex items-center justify-center transition-transform group-hover:scale-[1.03]"
            style={{ width: size, height: size }}
          >
            <svg
              className="h-full w-full -rotate-90 text-muted/30"
              viewBox={`0 0 ${size} ${size}`}
              aria-hidden="true"
            >
              <circle
                cx={center}
                cy={center}
                r={normalizedR}
                fill="none"
                stroke="currentColor"
                strokeWidth={stroke}
              />
              <circle
                cx={center}
                cy={center}
                r={normalizedR}
                fill="none"
                stroke="currentColor"
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${c}`}
                strokeLinecap="round"
                className={cn(
                  "transition-[stroke-dasharray]",
                  ringColor(rounded)
                )}
              />
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-semibold tracking-tight text-foreground tabular-nums">
                {rounded}
              </span>
              <span className="text-[10px] text-muted-foreground">of 100</span>
            </div>
          </div>
          <span className="text-sm font-medium text-foreground underline-offset-4 group-hover:underline">
            {bucket}
          </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="w-72 max-w-[min(18rem,calc(100vw-2rem))] border-border bg-popover p-3 text-popover-foreground shadow-md"
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{bucket}</p>
            <p className="text-[11px] leading-snug text-muted-foreground">
              {BUCKET_HELP[bucket]}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {controlCount} control{controlCount === 1 ? "" : "s"} · avg score{" "}
              {rounded}
            </p>
            <StatusMixLine mix={statusMix} />
          </div>

          {controlCount === 0 ? (
            <p className="text-[11px] text-muted-foreground">
              No controls in this group yet.
            </p>
          ) : (
            <div className="space-y-2.5">
              {factors.map((factor) => (
                <FactorBar key={factor.label} factor={factor} />
              ))}
              <div className="flex items-center gap-3 pt-0.5 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500/80" />
                  Available
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-destructive/50" />
                  Missing
                </span>
              </div>
            </div>
          )}

          <p className="border-t border-border pt-2 text-[11px] font-medium text-foreground">
            Click to view these controls
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function SafeguardBreakdownSection({
  summaries,
}: Props): React.JSX.Element {
  return (
    <Card className="border-border shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="inline-flex items-center gap-1.5 text-base font-semibold">
          HIPAA safeguard breakdown
          <HelpTip
            label="About safeguard breakdown"
            content="HIPAA groups safeguards into Administrative, Physical, Technical, and Organizational. Each ring is the average score of controls in that group. Hover for available vs missing evidence, freshness, org-wide policies, owners, and status mix. Click a ring to open those controls. Red is under 40, amber is 40 to 70, green is above 70."
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-6">
        <TooltipProvider delayDuration={200}>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-4">
            {summaries.map((summary) => (
              <SafeguardRing key={summary.bucket} summary={summary} />
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
