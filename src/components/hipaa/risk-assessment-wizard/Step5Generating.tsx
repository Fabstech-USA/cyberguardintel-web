"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AiGenerationWaitPanel,
  useSoftAiProgress,
  type AiGenerationPhase,
} from "@/components/shared/AiGenerationWaitPanel";

const PHASES: ReadonlyArray<AiGenerationPhase> = [
  {
    id: "scope",
    label: "Scoping PHI systems",
    detail: "Reviewing systems that create, receive, or store ePHI",
  },
  {
    id: "threats",
    label: "Identifying threat sources",
    detail: "Human, environmental, and technical threat scenarios",
  },
  {
    id: "score",
    label: "Scoring likelihood & impact",
    detail: "Ranking risks against your controls and environment",
  },
  {
    id: "recommend",
    label: "Drafting recommendations",
    detail: "Mapping findings to HIPAA Security Rule safeguards",
  },
  {
    id: "finish",
    label: "Assembling your assessment",
    detail: "Packaging threats, gaps, and next steps",
  },
];

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
  const softProgress = useSoftAiProgress({
    active: !error,
    ceiling: 94,
    tickMs: 900,
  });

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
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Step 5 of 5 - Generating
        </p>
      </div>

      <AiGenerationWaitPanel
        title="Generating your assessment"
        subtitle={`Analyzing threats across ${phiSystemCount} ${
          phiSystemCount === 1 ? "PHI system" : "PHI systems"
        } and mapping to HIPAA Security Rule controls.`}
        phases={PHASES}
        progress={softProgress}
        metaLeft="AI risk analysis in progress"
        accent="brand"
        phaseIntervalMs={14_000}
      />

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
          {softProgress >= 90 ? "Finishing up…" : "Generating…"}
        </Button>
      </div>
    </div>
  );
}
