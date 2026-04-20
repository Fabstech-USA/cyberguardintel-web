"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// Slugs here mirror the enum validated by /api/onboarding/phi-systems. Adding
// a new option means updating both sides.
const PHI_SYSTEMS = [
  { value: "epic_ehr", label: "Epic EHR" },
  { value: "athenahealth", label: "Athenahealth" },
  { value: "drchrono", label: "DrChrono" },
  { value: "aws_rds_s3", label: "AWS (RDS, S3)" },
  { value: "azure", label: "Azure" },
  { value: "twilio_sms", label: "Twilio SMS" },
  { value: "zoom_healthcare", label: "Zoom for Healthcare" },
  { value: "other", label: "Other" },
] as const;

type Props = {
  onBack: () => void;
  onComplete: () => void;
};

export function PhiSystemsStep({
  onBack,
  onComplete,
}: Props): React.JSX.Element {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(slug: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  async function handleSubmit(): Promise<void> {
    if (selected.size === 0) {
      setError("Select at least one system");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/phi-systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systems: Array.from(selected) }),
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
            `Failed to save systems (${res.status} ${res.statusText})`
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
            PHI systems
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Which systems store or touch PHI?
          </h2>
          <p className="text-sm text-muted-foreground">
            Select everything that applies. We&apos;ll map the data flows between
            them next.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PHI_SYSTEMS.map((sys) => {
            const active = selected.has(sys.value);
            return (
              <label
                key={sys.value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                  active
                    ? "border-brand bg-brand/5"
                    : "border-border hover:bg-muted"
                )}
              >
                <Checkbox
                  checked={active}
                  onCheckedChange={() => toggle(sys.value)}
                />
                <span className="text-sm font-medium">{sys.label}</span>
              </label>
            );
          })}
        </div>

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
            disabled={loading || selected.size === 0}
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
