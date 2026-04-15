"use client";

import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { CreateOrgStep } from "./CreateOrgStep";
import { SelectFrameworksStep } from "./SelectFrameworksStep";
import { InviteTeamStep } from "./InviteTeamStep";
import { ConnectIntegrationStep } from "./ConnectIntegrationStep";
import { CompleteStep } from "./CompleteStep";

const STEPS = [
  { label: "Organization" },
  { label: "Frameworks" },
  { label: "Team" },
  { label: "Integrations" },
  { label: "Complete" },
] as const;

type Props = {
  initialStep: number;
};

export function OnboardingWizard({ initialStep }: Props): React.JSX.Element {
  const [step, setStep] = useState(initialStep);
  const progress = ((step + 1) / STEPS.length) * 100;

  function next(): void {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {STEPS.map((s, i) => (
            <span
              key={s.label}
              className={
                i === step
                  ? "font-semibold text-foreground"
                  : i < step
                    ? "text-primary"
                    : ""
              }
            >
              {s.label}
            </span>
          ))}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {step === 0 && <CreateOrgStep onComplete={next} />}
      {step === 1 && <SelectFrameworksStep onComplete={next} />}
      {step === 2 && <InviteTeamStep onComplete={next} />}
      {step === 3 && <ConnectIntegrationStep onComplete={next} />}
      {step === 4 && <CompleteStep />}
    </div>
  );
}
