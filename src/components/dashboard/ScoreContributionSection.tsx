import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReadinessScoreBreakdown } from "@/lib/readiness-score-breakdown";

type Props = {
  breakdown: ReadinessScoreBreakdown;
  className?: string;
  /** Hide deep-link CTAs (use inside hover tooltips). */
  showActions?: boolean;
  /** Hide the earned/missing summary line (e.g. when a teaser is shown outside). */
  hideSummary?: boolean;
};

function formatPoints(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

/** One-line teaser for the collapsed readiness breakdown trigger. */
export function formatScoreBreakdownTeaser(
  breakdown: ReadinessScoreBreakdown
): string {
  if (breakdown.factors.length === 0) {
    return "Score details available after controls enroll";
  }
  const earned = formatPoints(breakdown.earnedTotal);
  if (breakdown.missingTotal <= 0) {
    return `Earning ${earned} of 100 · fully contributing`;
  }
  return `Earning ${earned} of 100 · ${formatPoints(breakdown.missingTotal)} still available`;
}

/** Compact factor rows for readiness score breakdown. */
export function ScoreContributionDetails({
  breakdown,
  className,
  showActions = true,
  hideSummary = false,
}: Props): React.JSX.Element {
  const { earnedTotal, missingTotal, factors } = breakdown;

  if (factors.length === 0) {
    return (
      <p
        data-tour="score-contribution"
        className={cn("text-xs text-muted-foreground", className)}
      >
        Score details will appear once HIPAA controls are enrolled.
      </p>
    );
  }

  return (
    <div
      data-tour="score-contribution"
      className={cn("space-y-3", className)}
    >
      {!hideSummary ? (
        <p className="text-xs text-muted-foreground">
          Earning {formatPoints(earnedTotal)} of 100 points.
          {missingTotal > 0
            ? ` ${formatPoints(missingTotal)} still available.`
            : " Nothing left to earn from these factors."}
        </p>
      ) : null}

      <ul className="space-y-2.5">
        {factors.map((factor) => {
          const pct =
            factor.maxPoints > 0
              ? Math.min(100, (factor.earnedPoints / factor.maxPoints) * 100)
              : 0;
          const complete = factor.missingPoints <= 0;

          return (
            <li key={factor.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-foreground">
                  {complete ? (
                    <Check
                      className="size-3.5 shrink-0 text-brand"
                      aria-hidden="true"
                    />
                  ) : null}
                  <span className="truncate">{factor.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {formatPoints(factor.earnedPoints)}
                  </span>
                  {" / "}
                  {formatPoints(factor.maxPoints)}
                </span>
              </div>

              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/80">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width]",
                    complete ? "bg-brand" : "bg-brand/70"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <p className="text-[11px] text-muted-foreground">
                  {factor.missingLabel
                    ? `Missing: ${factor.missingLabel}`
                    : factor.statusLabel}
                </p>
                {showActions &&
                factor.missingLabel &&
                factor.href &&
                factor.ctaLabel ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto px-0 text-[11px] text-brand"
                    asChild
                  >
                    <Link href={factor.href}>
                      {factor.ctaLabel}
                      <ArrowRight
                        className="ml-0.5 size-3"
                        aria-hidden="true"
                      />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
