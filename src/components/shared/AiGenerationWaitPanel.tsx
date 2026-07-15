"use client";

import { useEffect, useState } from "react";
import { CheckIcon, Loader2, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type AiGenerationPhase = {
  id: string;
  label: string;
  detail?: string;
};

type Props = {
  title: string;
  subtitle?: string;
  phases: ReadonlyArray<AiGenerationPhase>;
  /** Soft progress 0–100 (may advance with phases or parent). */
  progress: number;
  /** Optional footer meta, e.g. "1 of 8 policies complete". */
  metaLeft?: string;
  metaRight?: string;
  /** How long each phase stays active before advancing (ms). */
  phaseIntervalMs?: number;
  /** Accent: brand (risk) or emerald (policies). */
  accent?: "brand" | "emerald";
  className?: string;
  compact?: boolean;
};

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m <= 0) return `${s}s`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AiGenerationWaitPanel({
  title,
  subtitle,
  phases,
  progress,
  metaLeft,
  metaRight,
  phaseIntervalMs = 12_000,
  accent = "emerald",
  className,
  compact = false,
}: Props): React.JSX.Element {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    setPhaseIndex(0);
    setElapsedSec(0);
  }, [phases]);

  useEffect(() => {
    if (phases.length <= 1) return;
    const id = setInterval(() => {
      setPhaseIndex((prev) => Math.min(prev + 1, phases.length - 1));
    }, phaseIntervalMs);
    return () => clearInterval(id);
  }, [phases, phaseIntervalMs]);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const accentSpin =
    accent === "brand" ? "text-brand" : "text-emerald-500";
  const accentSoft =
    accent === "brand" ? "bg-brand/10" : "bg-emerald-500/10";
  const accentBorder =
    accent === "brand" ? "border-brand/25" : "border-emerald-500/30";
  const accentSpark =
    accent === "brand" ? "text-brand" : "text-emerald-400";
  const accentCheck =
    accent === "brand" ? "text-brand" : "text-emerald-600 dark:text-emerald-400";
  const accentDot =
    accent === "brand" ? "bg-brand" : "bg-emerald-500";
  const accentBar =
    accent === "brand"
      ? "bg-brand"
      : "bg-emerald-600 dark:bg-emerald-500";
  const accentWash =
    accent === "brand"
      ? "from-brand/10 via-transparent to-brand/5"
      : "from-emerald-500/10 via-transparent to-emerald-500/5";

  const clamped = Math.min(100, Math.max(0, Math.round(progress)));
  const activePhase = phases[phaseIndex] ?? phases[0];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card shadow-sm",
        accentBorder,
        compact ? "p-4" : "p-5 sm:p-6",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br motion-safe:animate-pulse",
          accentWash
        )}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1 overflow-hidden"
        aria-hidden
      >
        <div className="ai-gen-shimmer h-full w-1/3 rounded-full opacity-80" />
      </div>

      <div className="relative space-y-5">
        <div
          className={cn(
            "flex gap-4",
            compact ? "items-center" : "flex-col items-center text-center sm:flex-row sm:items-start sm:text-left"
          )}
        >
          <div className="relative flex shrink-0 items-center justify-center">
            <div
              className={cn(
                "absolute size-14 rounded-full opacity-40 motion-safe:animate-ping",
                accentSoft
              )}
              aria-hidden
            />
            <div
              className={cn(
                "relative flex size-12 items-center justify-center rounded-full",
                accentSoft
              )}
            >
              <Loader2
                className={cn("size-6 animate-spin", accentSpin)}
                aria-hidden
              />
              <Sparkles
                className={cn(
                  "absolute -right-0.5 -top-0.5 size-4 motion-safe:animate-pulse",
                  accentSpark
                )}
                aria-hidden
              />
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <h2
              className={cn(
                "font-semibold tracking-tight text-foreground",
                compact ? "text-base" : "text-lg sm:text-xl"
              )}
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
            {activePhase ? (
              <p className="text-sm text-foreground/90">
                <span className="text-muted-foreground">Now: </span>
                <span className="font-medium">{activePhase.label}</span>
                {activePhase.detail ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · {activePhase.detail}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>

          <div className="shrink-0 text-xs tabular-nums text-muted-foreground">
            <span className="sr-only">Elapsed time </span>
            {formatElapsed(elapsedSec)}
          </div>
        </div>

        <div className="space-y-2">
          <Progress
            value={clamped}
            className="h-2"
            indicatorClassName={cn(accentBar, "transition-[transform] duration-700 ease-out")}
          />
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="min-w-0 truncate">
              {metaLeft ?? "Working…"}
            </span>
            <span className="shrink-0 tabular-nums">
              {metaRight ?? `${clamped}%`}
            </span>
          </div>
        </div>

        <ol className="space-y-2.5">
          {phases.map((phase, idx) => {
            const done = idx < phaseIndex;
            const active = idx === phaseIndex;
            const upcoming = idx > phaseIndex;
            return (
              <li
                key={phase.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg px-2.5 py-2 transition-colors duration-300",
                  active && accentSoft,
                  upcoming && "opacity-55"
                )}
                aria-current={active ? "step" : undefined}
              >
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center">
                  {done ? (
                    <CheckIcon
                      className={cn("size-4", accentCheck)}
                      aria-hidden
                    />
                  ) : active ? (
                    <span
                      className={cn(
                        "relative flex size-2.5 items-center justify-center"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute size-2.5 rounded-full opacity-40 motion-safe:animate-ping",
                          accentDot
                        )}
                      />
                      <span
                        className={cn("relative size-2 rounded-full", accentDot)}
                      />
                    </span>
                  ) : (
                    <span
                      className="size-2 rounded-full bg-muted-foreground/35"
                      aria-hidden
                    />
                  )}
                </span>
                <div className="min-w-0 space-y-0.5">
                  <p
                    className={cn(
                      "text-sm",
                      done || active
                        ? "font-medium text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {phase.label}
                  </p>
                  {phase.detail && (active || done) ? (
                    <p className="text-xs text-muted-foreground">
                      {phase.detail}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>

        <p className="text-center text-xs text-muted-foreground sm:text-left">
          Keep this tab open. Drafts usually take about a minute each.
        </p>
      </div>
    </div>
  );
}

/** Soft progress that creeps forward while a long AI call runs (no stream ticks). */
export function useSoftAiProgress(options?: {
  active?: boolean;
  ceiling?: number;
  tickMs?: number;
  step?: number;
}): number {
  const active = options?.active ?? true;
  const ceiling = options?.ceiling ?? 92;
  const tickMs = options?.tickMs ?? 800;
  const step = options?.step ?? 1.2;
  const [value, setValue] = useState(6);

  useEffect(() => {
    if (!active) {
      setValue(100);
      return;
    }
    setValue(6);
    const id = setInterval(() => {
      setValue((prev) => {
        if (prev >= ceiling) return prev;
        const remaining = ceiling - prev;
        const next = prev + Math.max(0.35, step * (remaining / ceiling));
        return Math.min(ceiling, next);
      });
    }, tickMs);
    return () => clearInterval(id);
  }, [active, ceiling, tickMs, step]);

  return value;
}
