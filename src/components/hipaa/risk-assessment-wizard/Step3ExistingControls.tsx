"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  WIZARD_CONTROLS,
  type WizardControlId,
} from "@/lib/risk-assessment-controls";
import { cn } from "@/lib/utils";

type Props = {
  selected: ReadonlySet<WizardControlId>;
  onToggle: (id: WizardControlId, checked: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
};

export function Step3ExistingControls({
  selected,
  onToggle,
  onBack,
  onContinue,
}: Props): React.JSX.Element {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Step 3 of 5 - Existing controls
        </p>
        <h2 className="text-xl font-semibold tracking-tight">
          What safeguards do you already have in place?
        </h2>
        <p className="text-sm text-muted-foreground">
          Select everything currently implemented. Controls you don&apos;t
          select will be flagged as gaps.
        </p>
      </div>

      <div className="space-y-2">
        {WIZARD_CONTROLS.map((control) => {
          const checked = selected.has(control.id);
          const inputId = `wizard-control-${control.id}`;
          return (
            <label
              key={control.id}
              htmlFor={inputId}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors",
                checked
                  ? "border-brand/40 bg-brand/10"
                  : "border-border bg-muted/30 hover:bg-muted/50"
              )}
            >
              <Checkbox
                id={inputId}
                checked={checked}
                onCheckedChange={(value) => onToggle(control.id, value === true)}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-foreground">
                  {control.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {control.description}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          className="bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
