"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

const TARGET_SCORE = 86;

const NEXT_UP = [
  { label: "Approve Access Control Policy draft", impact: "+8", done: false },
  { label: "Connect Google Workspace evidence", impact: "+6", done: false },
  { label: "Upload signed BAA for Stripe", impact: "+4", done: true },
] as const;

export function HeroProductPreview(): React.JSX.Element {
  const [score, setScore] = useState(0);

  useEffect(() => {
    let frame = 0;
    const duration = 1100;
    const start = performance.now();

    function tick(now: number): void {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setScore(Math.round(eased * TARGET_SCORE));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const size = 140;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const normalizedR = r - stroke / 2;
  const c = 2 * Math.PI * normalizedR;
  const dash = (score / 100) * c;
  const center = size / 2;

  return (
    <div
      className="w-full animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-both"
      aria-hidden="true"
    >
      <div className="relative mx-auto w-full max-w-5xl">
        <div className="overflow-hidden rounded-t-2xl border border-b-0 border-border/80 bg-card shadow-[0_-12px_48px_-12px_oklch(0.48_0.09_161_/_0.18)] dark:shadow-[0_-12px_48px_-12px_oklch(0_0_0_/_0.45)]">
          <div className="flex items-center gap-2 border-b border-border/70 bg-muted/40 px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
            <span className="ml-3 text-xs text-muted-foreground">
              HIPAA readiness
            </span>
          </div>

          <div className="grid gap-8 p-6 sm:grid-cols-[auto_1fr] sm:p-8 lg:p-10">
            <div className="flex flex-col items-center gap-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Live score
              </p>
              <div
                className="relative flex items-center justify-center"
                style={{ width: size, height: size }}
              >
                <svg
                  className="h-full w-full -rotate-90 text-muted/30"
                  viewBox={`0 0 ${size} ${size}`}
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
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${c}`}
                    className="text-emerald-600 transition-[stroke-dasharray] duration-75 dark:text-emerald-500"
                  />
                </svg>
                <span className="absolute text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                  {score}
                </span>
              </div>
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-400">
                Strong
              </span>
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Next up
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Prioritized by readiness impact
              </p>
              <ul className="mt-4 space-y-3">
                {NEXT_UP.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-start justify-between gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-start gap-2.5">
                      {item.done ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" />
                      ) : (
                        <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
                      )}
                      <span
                        className={cn(
                          "text-sm font-medium text-foreground",
                          item.done && "text-muted-foreground line-through"
                        )}
                      >
                        {item.label}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-brand">
                      {item.impact}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
