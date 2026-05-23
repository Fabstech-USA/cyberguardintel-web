"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  currentPolicyTitle: string | null;
  completed: number;
  total: number;
  className?: string;
};

export function PolicyGenerationProgress({
  label,
  currentPolicyTitle,
  completed,
  total,
  className,
}: Props): React.JSX.Element {
  const isSingle = total === 1;
  // Count the policy currently being drafted as half a step so the bar moves
  // during long AI calls (we only get stream events at start/complete per policy).
  const inProgress = currentPolicyTitle !== null;
  const progressUnits = completed + (inProgress ? 0.5 : 0);
  const pct =
    total > 0 ? Math.min(100, Math.round((progressUnits / total) * 100)) : 0;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "border-emerald-500/30 bg-card relative overflow-hidden rounded-xl border p-4 shadow-sm",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-emerald-500/10 motion-safe:animate-pulse"
        aria-hidden
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex shrink-0 items-center justify-center">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
            <Loader2
              className="h-6 w-6 animate-spin text-emerald-500"
              aria-hidden
            />
            <Sparkles
              className="absolute -right-0.5 -top-0.5 h-4 w-4 text-emerald-400 motion-safe:animate-pulse"
              aria-hidden
            />
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">{label}</p>
            {currentPolicyTitle ? (
              <p className="text-muted-foreground truncate text-sm">
                {isSingle ? (
                  <>
                    Drafting{" "}
                    <span className="text-foreground font-medium">
                      {currentPolicyTitle}
                    </span>
                    …
                  </>
                ) : (
                  <>
                    Now generating:{" "}
                    <span className="text-foreground font-medium">
                      {currentPolicyTitle}
                    </span>
                  </>
                )}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Preparing your organization context…
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Progress value={pct} className="h-2" />
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>
                {completed} of {total} {total === 1 ? "policy" : "policies"}{" "}
                complete
                {inProgress && completed < total ? " · 1 in progress" : ""}
              </span>
              <span className="tabular-nums">{pct}%</span>
            </div>
          </div>

          <p className="text-muted-foreground text-xs">
            This usually takes about a minute per policy. You can keep this tab
            open while we draft each document.
          </p>
        </div>
      </div>
    </div>
  );
}
