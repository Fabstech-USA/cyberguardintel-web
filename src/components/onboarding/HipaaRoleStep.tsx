"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

type HipaaSubjectType = "covered_entity" | "business_associate" | "both";

const OPTIONS: ReadonlyArray<{
  value: HipaaSubjectType;
  label: string;
  description: string;
}> = [
  {
    value: "covered_entity",
    label: "Covered entity",
    description:
      "You deliver healthcare directly — a clinic, hospital, practice, or health plan.",
  },
  {
    value: "business_associate",
    label: "Business associate",
    description:
      "You handle PHI on behalf of a covered entity — e.g. a health-tech SaaS or analytics vendor.",
  },
  {
    value: "both",
    label: "Both",
    description:
      "You operate as a covered entity and also provide services that touch another entity's PHI.",
  },
];

type Props = {
  onBack: () => void;
  onComplete: () => void;
};

export function HipaaRoleStep({ onBack, onComplete }: Props): React.JSX.Element {
  const [value, setValue] = useState<HipaaSubjectType | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(): Promise<void> {
    if (!value) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/hipaa-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hipaaSubjectType: value }),
      });

      const raw = await res.text();
      const data = raw
        ? ((): { error?: string } => {
            try {
              return JSON.parse(raw) as { error?: string };
            } catch {
              return {};
            }
          })()
        : {};

      if (!res.ok) {
        throw new Error(
          data.error ??
            `Failed to save role (${res.status} ${res.statusText})`
        );
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-8 p-8">
        <div className="space-y-1">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            HIPAA role
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            How do you interact with PHI?
          </h2>
          <p className="text-sm text-muted-foreground">
            This determines which HIPAA Security Rule obligations apply and
            which policies we generate.
          </p>
        </div>

        <RadioGroup
          value={value}
          onValueChange={(v) => setValue(v as HipaaSubjectType)}
          className="space-y-3"
        >
          {OPTIONS.map((opt) => {
            const active = value === opt.value;
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors",
                  active
                    ? "border-brand bg-brand/5"
                    : "border-border hover:bg-muted"
                )}
              >
                <div className="flex-1 space-y-1">
                  <div className="text-sm font-semibold text-foreground">
                    {opt.label}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {opt.description}
                  </div>
                </div>
                <RadioGroupItem value={opt.value} className="mt-1" />
              </label>
            );
          })}
        </RadioGroup>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={loading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !value}
            className="bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active"
          >
            {loading ? "Saving..." : "Continue"}
            {!loading && (
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
