"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { HelpTip } from "@/components/shared/HelpTip";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  groupWizardControlsBySafeguard,
  type WizardControlId,
} from "@/lib/risk-assessment-controls";
import type { SafeguardBucket } from "@/lib/dashboard-safeguards";
import { cn } from "@/lib/utils";

type Props = {
  selected: ReadonlySet<WizardControlId>;
  onToggle: (id: WizardControlId, checked: boolean) => void;
  onToggleMany: (
    ids: ReadonlyArray<WizardControlId>,
    checked: boolean
  ) => void;
  onBack: () => void;
  onContinue: () => void;
};

const groups = groupWizardControlsBySafeguard();

function initialOpenGroups(
  selected: ReadonlySet<WizardControlId>
): Record<SafeguardBucket, boolean> {
  const open = {} as Record<SafeguardBucket, boolean>;
  for (const group of groups) {
    open[group.bucket] = group.controls.some((c) => selected.has(c.id));
  }
  return open;
}

export function Step3ExistingControls({
  selected,
  onToggle,
  onToggleMany,
  onBack,
  onContinue,
}: Props): React.JSX.Element {
  const [openGroups, setOpenGroups] = useState<Record<SafeguardBucket, boolean>>(
    () => initialOpenGroups(selected)
  );

  const selectedCount = selected.size;
  const totalCount = groups.reduce((sum, g) => sum + g.controls.length, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Step 3 of 5 - Existing controls
        </p>
        <h2 className="inline-flex items-center gap-1.5 text-xl font-semibold tracking-tight">
          What safeguards do you already have in place?
          <HelpTip content="Only check controls you truly run today. Unchecked items are treated as gaps in the risk analysis. Checking a control marks it Implemented in your HIPAA workspace. Use Select all on a group when every control in that family is in place." />
        </h2>
        <p className="text-sm text-muted-foreground">
          Select every HIPAA control that is currently implemented.{" "}
          {selectedCount} of {totalCount} selected.
        </p>
      </div>

      <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
        {groups.map((group) => {
          const ids = group.controls.map((c) => c.id);
          const groupSelected = group.controls.filter((c) =>
            selected.has(c.id)
          ).length;
          const allSelected =
            group.controls.length > 0 &&
            groupSelected === group.controls.length;
          const open = openGroups[group.bucket] ?? true;
          const selectAllId = `wizard-group-select-${group.bucket}`;

          return (
            <Collapsible
              key={group.bucket}
              open={open}
              onOpenChange={(next) =>
                setOpenGroups((prev) => ({ ...prev, [group.bucket]: next }))
              }
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="flex items-center gap-2 px-3 py-2.5">
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-muted/40"
                    aria-expanded={open}
                  >
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                        open && "rotate-180"
                      )}
                      aria-hidden
                    />
                    <span className="truncate text-sm font-semibold text-foreground">
                      {group.bucket}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {groupSelected}/{group.controls.length}
                    </span>
                  </button>
                </CollapsibleTrigger>

                <label
                  htmlFor={selectAllId}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Checkbox
                    id={selectAllId}
                    checked={allSelected}
                    onCheckedChange={(value) => {
                      onToggleMany(ids, value === true);
                    }}
                    aria-label={
                      allSelected
                        ? `Clear all ${group.bucket} controls`
                        : `Select all ${group.bucket} controls`
                    }
                  />
                  <span>{allSelected ? "Clear all" : "Select all"}</span>
                </label>
              </div>

              <CollapsibleContent>
                <div className="space-y-2 border-t border-border px-3 py-3">
                  {group.controls.map((control) => {
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
                          onCheckedChange={(value) =>
                            onToggle(control.id, value === true)
                          }
                          className="mt-0.5"
                        />
                        <div className="min-w-0 space-y-0.5">
                          <div className="text-sm font-medium text-foreground">
                            {control.label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {control.controlRef}
                            {" · "}
                            {control.isRequired ? "Required" : "Addressable"}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        <Button type="button" onClick={onContinue}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
