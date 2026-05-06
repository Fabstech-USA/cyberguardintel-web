"use client";

import { useEffect, useState } from "react";
import type { RiskAssessment } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentId: string;
  version: number;
  onApproved: (updated: RiskAssessment) => void;
};

export function ApproveDialog({
  open,
  onOpenChange,
  assessmentId,
  version,
  onApproved,
}: Props): React.JSX.Element {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset transient state whenever the dialog is closed/reopened so the user
  // doesn't see a stale "checked" or error from a prior interaction.
  useEffect(() => {
    if (!open) {
      setConfirmed(false);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  async function approve(): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/hipaa/risk-assessment/${assessmentId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const raw = await res.text();
      if (!res.ok) {
        let message = `Failed to approve (${res.status})`;
        try {
          const parsed = raw ? (JSON.parse(raw) as { error?: string }) : null;
          if (parsed?.error) message = parsed.error;
        } catch {
          /* leave default */
        }
        throw new Error(message);
      }
      const updated = JSON.parse(raw) as RiskAssessment;
      onApproved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve risk assessment</DialogTitle>
          <DialogDescription>
            Approving locks v{version} as your current Security Risk Analysis.
            AI-generated content has been reviewed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <Checkbox
            id="approve-confirm"
            checked={confirmed}
            onCheckedChange={(value) => setConfirmed(value === true)}
            className="mt-0.5"
          />
          <Label
            htmlFor="approve-confirm"
            className="cursor-pointer text-sm leading-relaxed"
          >
            I have reviewed each threat and recommendation.
          </Label>
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void approve()}
            disabled={!confirmed || submitting}
            className="bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active"
          >
            {submitting ? "Approving..." : "Approve assessment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
