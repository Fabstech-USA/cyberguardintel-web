"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const FRAMEWORKS = [
  {
    slug: "HIPAA",
    name: "HIPAA",
    description:
      "Privacy, security, and breach notification rules for protected health information.",
    tag: "Healthcare",
  },
  {
    slug: "SOC2",
    name: "SOC 2",
    description:
      "Security, availability, and confidentiality controls for service organizations.",
    tag: "SaaS / Cloud",
  },
  {
    slug: "PCI_DSS",
    name: "PCI DSS",
    description:
      "Requirements for organizations that store, process, or transmit cardholder data.",
    tag: "Payments",
  },
  {
    slug: "ISO27001",
    name: "ISO 27001",
    description:
      "International standard for information security management systems.",
    tag: "Enterprise",
  },
  {
    slug: "CMMC",
    name: "CMMC",
    description:
      "Required for U.S. DoD contractors handling controlled unclassified information.",
    tag: "Government",
  },
] as const;

type Props = {
  onComplete: () => void;
};

export function SelectFrameworksStep({ onComplete }: Props): React.JSX.Element {
  const [selected, setSelected] = useState<Set<string>>(new Set(["HIPAA"]));
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
      setError("Select at least one framework");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/frameworks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frameworkSlugs: Array.from(selected) }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to save frameworks");
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
      <CardHeader>
        <CardTitle>Select compliance frameworks</CardTitle>
        <CardDescription>
          Choose which frameworks your organization needs. You can always add
          more later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {FRAMEWORKS.map((fw) => (
          <label
            key={fw.slug}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5"
          >
            <Checkbox
              checked={selected.has(fw.slug)}
              onCheckedChange={() => toggle(fw.slug)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{fw.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {fw.tag}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {fw.description}
              </p>
            </div>
          </label>
        ))}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          onClick={handleSubmit}
          className="w-full"
          disabled={loading || selected.size === 0}
        >
          {loading ? "Saving..." : "Continue"}
        </Button>
      </CardContent>
    </Card>
  );
}
