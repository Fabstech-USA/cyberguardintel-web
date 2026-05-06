"use client";

import { useMemo, useState } from "react";
import type { RiskAssessment } from "@/generated/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { type WizardControlId } from "@/lib/risk-assessment-controls";
import { Step1OrgProfile } from "./risk-assessment-wizard/Step1OrgProfile";
import { Step2PhiSystems } from "./risk-assessment-wizard/Step2PhiSystems";
import { Step3ExistingControls } from "./risk-assessment-wizard/Step3ExistingControls";
import { Step4Review } from "./risk-assessment-wizard/Step4Review";
import { Step5Generating } from "./risk-assessment-wizard/Step5Generating";
import { WizardProgressBar } from "./risk-assessment-wizard/WizardProgressBar";
import type {
  WizardPhiSystem,
  WizardProfile,
  WizardSubmitPayload,
} from "./risk-assessment-wizard/types";

type Props = {
  initialProfile: WizardProfile;
  initialPhiSystems: ReadonlyArray<WizardPhiSystem>;
  initialImplementedControlIds: ReadonlyArray<WizardControlId>;
  hasExistingAssessment: boolean;
  onCancel: () => void;
  onComplete: (assessment: RiskAssessment) => void;
};

type StepNumber = 1 | 2 | 3 | 4 | 5;

export function RiskAssessmentWizard({
  initialProfile,
  initialPhiSystems,
  initialImplementedControlIds,
  hasExistingAssessment,
  onCancel,
  onComplete,
}: Props): React.JSX.Element {
  const [step, setStep] = useState<StepNumber>(1);
  const [profile, setProfile] = useState<WizardProfile>(initialProfile);
  const [controls, setControls] = useState<Set<WizardControlId>>(
    () => new Set(initialImplementedControlIds)
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phiSystems = initialPhiSystems;

  function go(next: StepNumber): void {
    setStep(next);
  }

  function toggleControl(id: WizardControlId, checked: boolean): void {
    setControls((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function submit(): Promise<void> {
    setError(null);
    setGenerating(true);
    go(5);

    const payload: WizardSubmitPayload = {
      profile,
      implementedControlIds: Array.from(controls),
    };

    try {
      const res = await fetch("/api/hipaa/risk-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      if (!res.ok) {
        let message = `Failed to generate (${res.status})`;
        try {
          const parsed = raw ? (JSON.parse(raw) as { error?: string }) : null;
          if (parsed?.error) message = parsed.error;
        } catch {
          /* leave default */
        }
        throw new Error(message);
      }

      const created = JSON.parse(raw) as RiskAssessment;
      onComplete(created);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setGenerating(false);
    }
  }

  function retry(): void {
    void submit();
  }

  const cancelToParent = useMemo(
    () => (hasExistingAssessment ? onCancel : onCancel),
    [hasExistingAssessment, onCancel]
  );

  return (
    <Card>
      <CardContent className="space-y-6 p-6 sm:p-8">
        <div className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              New risk assessment
            </h1>
            <p className="text-sm text-muted-foreground">
              Step through the five-question flow. You can edit any answer
              before generating.
            </p>
          </div>
          <WizardProgressBar currentStep={step} />
        </div>

        {step === 1 && (
          <Step1OrgProfile
            profile={profile}
            onChange={setProfile}
            onCancel={cancelToParent}
            onContinue={() => go(2)}
          />
        )}
        {step === 2 && (
          <Step2PhiSystems
            phiSystems={phiSystems}
            onBack={() => go(1)}
            onContinue={() => go(3)}
          />
        )}
        {step === 3 && (
          <Step3ExistingControls
            selected={controls}
            onToggle={toggleControl}
            onBack={() => go(2)}
            onContinue={() => go(4)}
          />
        )}
        {step === 4 && (
          <Step4Review
            profile={profile}
            phiSystemCount={phiSystems.length}
            controlsImplementedCount={controls.size}
            onBack={() => go(3)}
            onGenerate={() => void submit()}
            generating={generating}
          />
        )}
        {step === 5 && (
          <Step5Generating
            phiSystemCount={phiSystems.length}
            error={error}
            onBack={() => {
              setError(null);
              go(4);
            }}
            onRetry={retry}
          />
        )}
      </CardContent>
    </Card>
  );
}
