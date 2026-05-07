"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PHASES = [
  "Scoping PHI systems",
  "Identifying threat sources",
  "Scoring likelihood & impact",
  "Drafting recommendations",
] as const;

const PHASE_INTERVAL_MS = 15_000;

type Props = {
  phiSystemCount: number;
  error: string | null;
  onBack: () => void;
  onRetry: () => void;
};

export function Step5Generating({
  phiSystemCount,
  error,
  onBack,
  onRetry,
}: Props): React.JSX.Element {
  // Cycle through the four phases on a fixed timeline. Once we exhaust the
  // list we hold on the last phase indefinitely until the parent unmounts
  // this step (request resolved) or surfaces an error.
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    if (error) return;
    const id = setInterval(() => {
      setPhaseIndex((prev) => Math.min(prev + 1, PHASES.length - 1));
    }, PHASE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [error]);

  const finishingUp = phaseIndex >= PHASES.length - 1;

  if (error) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Step 5 of 5 - Generating
          </p>
          <h2 className="text-xl font-semibold tracking-tight">
            We couldn&apos;t finish your assessment
          </h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back
          </Button>
          <Button
            type="button"
            onClick={onRetry}
            className="bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active"
          >
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-6 py-10 text-center">
        <Loader2
          className="h-10 w-10 animate-spin text-brand"
          aria-hidden="true"
        />
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">
            Generating your assessment
          </h2>
          <p className="text-sm text-muted-foreground">
            Analyzing threats across {phiSystemCount}{" "}
            {phiSystemCount === 1 ? "PHI system" : "PHI systems"} and mapping to
            HIPAA Security Rule controls.
          </p>
        </div>
        <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
          {PHASES.map((phase, idx) => (
            <li
              key={phase}
              className={cn(
                "flex items-center gap-1.5",
                idx <= phaseIndex
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
              aria-current={idx === phaseIndex ? "step" : undefined}
            >
              {idx < phaseIndex ? (
                <CheckIcon
                  className="h-3.5 w-3.5 text-brand"
                  aria-hidden="true"
                />
              ) : (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-current"
                  aria-hidden="true"
                />
              )}
              {phase}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button type="button" variant="outline" disabled>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        <Button
          type="button"
          disabled
          className="bg-brand text-brand-foreground"
        >
          {finishingUp ? "Finishing up..." : "Generating..."}
        </Button>
      </div>
    </div>
  );
}
