"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WIZARD_CONTROLS } from "@/lib/risk-assessment-controls";
import type { WizardProfile } from "./types";

type Props = {
  profile: WizardProfile;
  phiSystemCount: number;
  controlsImplementedCount: number;
  onBack: () => void;
  onGenerate: () => void;
  generating: boolean;
};

export function Step4Review({
  profile,
  phiSystemCount,
  controlsImplementedCount,
  onBack,
  onGenerate,
  generating,
}: Props): React.JSX.Element {
  const totalControls = WIZARD_CONTROLS.length;
  const expectedGaps = totalControls - controlsImplementedCount;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Step 4 of 5 - Review and confirm
        </p>
        <h2 className="text-xl font-semibold tracking-tight">Ready to generate</h2>
        <p className="text-sm text-muted-foreground">
          We&apos;ll use your inputs plus professionally reviewed HIPAA prompt
          (aligned with HHS guidance) to draft your Security Risk Analysis.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-muted/40">
        <ReviewRow label="Organization" value={profile.name} />
        <ReviewRow
          label="PHI systems"
          value={`${phiSystemCount} ${phiSystemCount === 1 ? "system" : "systems"}`}
        />
        <ReviewRow
          label="Controls in place"
          value={`${controlsImplementedCount} of ${totalControls}`}
        />
        <ReviewRow label="Expected gaps" value={`${expectedGaps}`} />
        <ReviewRow label="Est. generation time" value="~60 seconds" isLast />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={generating}
        >
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        <Button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active"
        >
          Generate assessment
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  isLast,
}: {
  label: string;
  value: string;
  isLast?: boolean;
}): React.JSX.Element {
  return (
    <div
      className={
        "flex items-center justify-between px-4 py-3" +
        (isLast ? "" : " border-b border-border")
      }
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
