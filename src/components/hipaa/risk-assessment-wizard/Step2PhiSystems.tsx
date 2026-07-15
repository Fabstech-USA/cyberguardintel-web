"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WizardPhiSystem } from "./types";

const SYSTEM_TYPE_LABELS: Record<string, string> = {
  emr: "EMR",
  ehr: "EHR",
  database: "Database",
  api: "API",
  cloud: "Cloud",
  communication: "Communication",
  analytics: "Analytics",
  other: "Other",
};

function describeSystem(system: WizardPhiSystem): string {
  if (system.description && system.description.trim().length > 0) {
    return system.description;
  }
  return SYSTEM_TYPE_LABELS[system.systemType] ?? system.systemType;
}

type Props = {
  phiSystems: ReadonlyArray<WizardPhiSystem>;
  onBack: () => void;
  onContinue: () => void;
};

export function Step2PhiSystems({
  phiSystems,
  onBack,
  onContinue,
}: Props): React.JSX.Element {
  const empty = phiSystems.length === 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Step 2 of 5 - PHI systems</p>
        <h2 className="text-xl font-semibold tracking-tight">
          PHI systems in scope
        </h2>
        <p className="text-sm text-muted-foreground">
          The assessment will evaluate threats across each of these systems.
        </p>
      </div>

      {empty ? (
        <div className="rounded-xl border border-border bg-muted/40 p-6 text-sm">
          <p className="font-medium">No PHI systems on record.</p>
          <p className="mt-1 text-muted-foreground">
            You need at least one system before generating an assessment. Add
            systems on the PHI flow map, then return here to continue.
          </p>
          <Button asChild className="mt-4 bg-brand text-brand-foreground hover:bg-brand-hover">
            <Link href="/hipaa/phi-map">Go to PHI map</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-border bg-muted/40">
            {phiSystems.map((s, idx) => (
              <div
                key={`${s.name}-${idx}`}
                className={
                  "flex items-start justify-between gap-4 px-4 py-3" +
                  (idx < phiSystems.length - 1 ? " border-b border-border" : "")
                }
              >
                <span className="text-sm font-medium text-foreground">
                  {s.name}
                </span>
                <span className="text-right text-sm text-muted-foreground">
                  {describeSystem(s)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Need to add or change systems?{" "}
            <Link
              href="/hipaa/phi-map"
              className="font-medium text-brand underline underline-offset-2 hover:text-brand-hover"
            >
              Edit on PHI map
            </Link>
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back
        </Button>
        <Button
          type="button"
          onClick={onContinue}
          disabled={empty}
          className="bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
