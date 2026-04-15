"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = {
  onComplete: () => void;
};

export function InviteTeamStep({ onComplete }: Props): React.JSX.Element {
  const [emails, setEmails] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateEmail(index: number, value: string): void {
    setEmails((prev) => prev.map((e, i) => (i === index ? value : e)));
  }

  function addRow(): void {
    setEmails((prev) => [...prev, ""]);
  }

  function removeRow(index: number): void {
    setEmails((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(): Promise<void> {
    const valid = emails.filter((e) => e.trim().length > 0);
    if (valid.length === 0) {
      onComplete();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: valid }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to send invitations");
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip(): Promise<void> {
    setLoading(true);
    try {
      await fetch("/api/onboarding/complete", { method: "POST" });
    } catch {
      // advance anyway; the step is skippable
    }
    setLoading(false);
    onComplete();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite your team</CardTitle>
        <CardDescription>
          Add team members who will help manage compliance. You can skip this and
          invite people later from Settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {emails.map((email, i) => (
            <div key={i} className="flex gap-2">
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => updateEmail(i, e.target.value)}
              />
              {emails.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(i)}
                  aria-label="Remove email"
                >
                  &times;
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          + Add another
        </Button>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleSkip}
            disabled={loading}
          >
            Skip for now
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send invitations"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
