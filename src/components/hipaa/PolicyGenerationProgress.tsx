"use client";

import { useMemo } from "react";
import {
  AiGenerationWaitPanel,
  useSoftAiProgress,
  type AiGenerationPhase,
} from "@/components/shared/AiGenerationWaitPanel";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  currentPolicyTitle: string | null;
  completed: number;
  total: number;
  className?: string;
};

const POLICY_PHASES: ReadonlyArray<AiGenerationPhase> = [
  {
    id: "context",
    label: "Loading organization context",
    detail: "PHI systems, stack, and controls from your profile",
  },
  {
    id: "outline",
    label: "Outlining policy sections",
    detail: "Mapping required HIPAA policy structure",
  },
  {
    id: "draft",
    label: "Drafting with AI",
    detail: "Writing role-specific procedures and responsibilities",
  },
  {
    id: "align",
    label: "Aligning to Security Rule language",
    detail: "Checking safeguards and operational fit",
  },
  {
    id: "finalize",
    label: "Finalizing the draft",
    detail: "Formatting for review and approval",
  },
];

export function PolicyGenerationProgress({
  label,
  currentPolicyTitle,
  completed,
  total,
  className,
}: Props): React.JSX.Element {
  const isSingle = total === 1;
  const inProgress = currentPolicyTitle !== null;
  const soft = useSoftAiProgress({
    active: inProgress || completed < total,
    ceiling: 88,
  });

  // Blend batch completion with soft progress for the active policy.
  const base = total > 0 ? (completed / total) * 100 : 0;
  const activeSlice = total > 0 ? 100 / total : 0;
  const progress = Math.min(
    99,
    base + (inProgress ? (soft / 100) * activeSlice * 0.9 : 0)
  );

  const phases = useMemo(() => {
    if (!currentPolicyTitle) {
      return [
        {
          id: "prep",
          label: "Preparing your organization context",
          detail: "Gathering profile data before drafting",
        },
        ...POLICY_PHASES.slice(1),
      ] as AiGenerationPhase[];
    }
    return POLICY_PHASES.map((phase, index) =>
      index === 2
        ? {
            ...phase,
            detail: `Writing “${currentPolicyTitle}”`,
          }
        : phase
    );
  }, [currentPolicyTitle]);

  const subtitle = currentPolicyTitle
    ? isSingle
      ? `Drafting ${currentPolicyTitle}`
      : `Now generating: ${currentPolicyTitle}`
    : "Preparing your organization context…";

  return (
    <AiGenerationWaitPanel
      title={label}
      subtitle={subtitle}
      phases={phases}
      progress={progress}
      metaLeft={`${completed} of ${total} ${total === 1 ? "policy" : "policies"} complete${
        inProgress && completed < total ? " · 1 in progress" : ""
      }`}
      metaRight={`${Math.round(progress)}%`}
      accent="emerald"
      phaseIntervalMs={isSingle ? 10_000 : 8_000}
      className={cn(className)}
    />
  );
}
