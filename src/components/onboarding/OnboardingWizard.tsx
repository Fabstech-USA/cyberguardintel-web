"use client";

import { useState } from "react";
import { SelectPlanStep } from "./SelectPlanStep";
import { WelcomeStep } from "./WelcomeStep";
import { OrgDetailsStep } from "./OrgDetailsStep";
import { HipaaRoleStep } from "./HipaaRoleStep";
import { PhiSystemsStep } from "./PhiSystemsStep";
import { TechStackStep } from "./TechStackStep";
import { CompleteStep } from "./CompleteStep";
import type { PlanId } from "@/lib/plans";

// Wizard step indices. Keep the numeric values stable: they map 1-for-1 to
// Organization.onboardingStep on the server (except 0/1, which are pre-org).
const STEP_PLAN = 0;
const STEP_WELCOME = 1;
const STEP_ORG_DETAILS = 2;
const STEP_HIPAA_ROLE = 3;
const STEP_PHI_SYSTEMS = 4;
const STEP_TECH_STACK = 5;
const STEP_COMPLETE = 6;

const LAST_STEP = STEP_COMPLETE;

// Only the four data-collection steps contribute to the "Step X of 4"
// progress chrome. Plan, Welcome, and Complete each have their own framing
// (pricing grid, expectation-setter, success screen) so a shared progress
// bar across all seven would feel noisy.
const FORM_STEPS: readonly number[] = [
  STEP_ORG_DETAILS,
  STEP_HIPAA_ROLE,
  STEP_PHI_SYSTEMS,
  STEP_TECH_STACK,
];

function clampStep(value: number): number {
  if (Number.isNaN(value)) return STEP_PLAN;
  return Math.max(STEP_PLAN, Math.min(value, LAST_STEP));
}

type Props = {
  initialStep: number;
  recommendedPlan?: PlanId;
};

export function OnboardingWizard({
  initialStep,
  recommendedPlan,
}: Props): React.JSX.Element {
  const [step, setStep] = useState<number>(() => clampStep(initialStep));

  function goTo(nextStep: number): void {
    setStep(clampStep(nextStep));
  }

  function next(): void {
    goTo(step + 1);
  }

  function back(): void {
    goTo(step - 1);
  }

  // The plan step uses a 3-card grid that needs breathing room; every other
  // step is a narrow single-column form.
  const wrapperMaxWidth = step === STEP_PLAN ? "max-w-5xl" : "max-w-2xl";

  const formStepIndex = FORM_STEPS.indexOf(step);
  const showFormChrome = formStepIndex >= 0;

  return (
    <div className={`mx-auto w-full ${wrapperMaxWidth} space-y-6`}>
      {showFormChrome && (
        <FormProgressBar
          currentFormStep={formStepIndex + 1}
          totalFormSteps={FORM_STEPS.length}
        />
      )}

      {step === STEP_PLAN && (
        <SelectPlanStep
          recommendedPlan={recommendedPlan}
          onComplete={() => goTo(STEP_WELCOME)}
        />
      )}

      {step === STEP_WELCOME && (
        <WelcomeStep
          onChangePlan={() => goTo(STEP_PLAN)}
          onComplete={() => goTo(STEP_ORG_DETAILS)}
        />
      )}

      {step === STEP_ORG_DETAILS && (
        <OrgDetailsStep
          onBack={() => goTo(STEP_WELCOME)}
          onComplete={() => goTo(STEP_HIPAA_ROLE)}
        />
      )}

      {step === STEP_HIPAA_ROLE && (
        <HipaaRoleStep onBack={back} onComplete={next} />
      )}

      {step === STEP_PHI_SYSTEMS && (
        <PhiSystemsStep onBack={back} onComplete={next} />
      )}

      {step === STEP_TECH_STACK && (
        <TechStackStep onBack={back} onComplete={next} />
      )}

      {step === STEP_COMPLETE && <CompleteStep />}
    </div>
  );
}

function FormProgressBar({
  currentFormStep,
  totalFormSteps,
}: {
  currentFormStep: number;
  totalFormSteps: number;
}): React.JSX.Element {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Setup</span>
        <span>
          Step {currentFormStep} of {totalFormSteps}
        </span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: totalFormSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < currentFormStep ? "bg-brand" : "bg-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
