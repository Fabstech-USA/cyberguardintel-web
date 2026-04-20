"use client";

import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

// Values here mirror the enum validated by /api/onboarding/tech-stack.
const TECH_STACK = [
  { value: "aws", label: "AWS" },
  { value: "google_cloud", label: "Google Cloud" },
  { value: "azure", label: "Azure" },
  { value: "google_workspace", label: "Google Workspace" },
  { value: "microsoft_365", label: "Microsoft 365" },
  { value: "github", label: "GitHub" },
  { value: "okta", label: "Okta" },
  { value: "slack", label: "Slack" },
] as const;

type Props = {
  onBack: () => void;
  onComplete: () => void;
};

export function TechStackStep({
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
    setLoading(true);
    setError(null);

    try {
      // Tech stack is optional — users may have none of these. Sending an
      // empty array still marks onboarding complete on the server.
      const res = await fetch("/api/onboarding/tech-stack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ techStack: Array.from(selected) }),
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
            `Failed to save tech stack (${res.status} ${res.statusText})`
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
            Technology stack
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            What else powers your operation?
          </h2>
          <p className="text-sm text-muted-foreground">
            We&apos;ll auto-connect evidence collection for each integration you
            select.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TECH_STACK.map((tool) => {
            const active = selected.has(tool.value);
            return (
              <label
                key={tool.value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors",
                  active
                    ? "border-brand bg-brand/5"
                    : "border-border hover:bg-muted"
                )}
              >
                <Checkbox
                  checked={active}
                  onCheckedChange={() => toggle(tool.value)}
                />
                <span className="text-sm font-medium">{tool.label}</span>
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
            disabled={loading}
            className="bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active"
          >
            {loading ? "Saving..." : "Finish"}
            {!loading && (
              <Check className="ml-2 h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
