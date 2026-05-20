"use client";

import { useEffect, useState } from "react";
import type { Policy } from "@/generated/prisma";
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
  policyId: string;
  version: number;
  title: string;
  onApproved: (updated: Policy) => void;
};

export function PolicyApproveDialog({
  open,
  onOpenChange,
  policyId,
  version,
  title,
  onApproved,
}: Props): React.JSX.Element {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const res = await fetch(`/api/hipaa/policies/${policyId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
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
      const updated = JSON.parse(raw) as Policy;
      onApproved(updated);
      onOpenChange(false);
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
          <DialogTitle>Approve policy</DialogTitle>
          <DialogDescription>
            Approving locks v{version} of &ldquo;{title}&rdquo; as your current
            policy. Review dates are set to one year from today.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <Checkbox
            id="policy-approve-confirm"
            checked={confirmed}
            onCheckedChange={(value) => setConfirmed(value === true)}
            className="mt-0.5"
          />
          <Label
            htmlFor="policy-approve-confirm"
            className="cursor-pointer text-sm leading-relaxed"
          >
            I have reviewed this policy and it is ready for use in our HIPAA
            program.
          </Label>
        </div>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

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
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {submitting ? "Approving…" : "Approve policy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
