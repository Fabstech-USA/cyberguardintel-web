"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RiskAssessment } from "@/generated/prisma";
import type { WizardControlId } from "@/lib/risk-assessment-controls";
import { RiskAssessmentResult } from "./RiskAssessmentResult";
import { RiskAssessmentWizard } from "./RiskAssessmentWizard";
import type {
  WizardPhiSystem,
  WizardProfile,
} from "./risk-assessment-wizard/types";

type Props = {
  initialAssessment: RiskAssessment | null;
  approvedByName: string | null;
  organizationName: string;
  initialProfile: WizardProfile;
  initialPhiSystems: ReadonlyArray<WizardPhiSystem>;
  initialImplementedControlIds: ReadonlyArray<WizardControlId>;
  canApprove: boolean;
};

type View = "result" | "wizard";

export function RiskAssessmentClient({
  initialAssessment,
  approvedByName,
  organizationName,
  initialProfile,
  initialPhiSystems,
  initialImplementedControlIds,
  canApprove,
}: Props): React.JSX.Element {
  const router = useRouter();
  const [view, setView] = useState<View>(
    initialAssessment ? "result" : "wizard"
  );
  const [assessment, setAssessment] = useState<RiskAssessment | null>(
    initialAssessment
  );

  function handleStartNew(): void {
    setView("wizard");
  }

  function handleCancelWizard(): void {
    if (assessment) setView("result");
    else router.push("/hipaa");
  }

  function handleWizardComplete(created: RiskAssessment): void {
    setAssessment(created);
    setView("result");
    // Refresh the server component so future visits hit the new latest row
    // and the page-level org-context derives from updated rows.
    router.refresh();
  }

  function handleApproved(updated: RiskAssessment): void {
    setAssessment(updated);
    router.refresh();
  }

  if (view === "result" && assessment) {
    return (
      <RiskAssessmentResult
        assessment={assessment}
        organizationName={organizationName}
        approvedByName={approvedByName}
        canApprove={canApprove}
        onStartNew={handleStartNew}
        onApproved={handleApproved}
      />
    );
  }

  return (
    <RiskAssessmentWizard
      initialProfile={initialProfile}
      initialPhiSystems={initialPhiSystems}
      initialImplementedControlIds={initialImplementedControlIds}
      hasExistingAssessment={Boolean(assessment)}
      onCancel={handleCancelWizard}
      onComplete={handleWizardComplete}
    />
  );
}
