"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatPolicyVersion } from "@/lib/hipaa-policy-version";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyId: string;
  displayTitle: string;
  currentVersion: number;
  onRegenerated: () => void;
};

export function PolicyRejectRegenerateDialog({
  open,
  onOpenChange,
  policyId,
  displayTitle,
  currentVersion,
  onRegenerated,
}: Props): React.JSX.Element {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  async function confirm(): Promise<void> {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/hipaa/policies/${policyId}/reject-regenerate`,
        { method: "POST" }
      );
      const raw = await res.text();
      if (!res.ok) {
        let message = `Reject and regenerate failed (${res.status})`;
        try {
          const parsed = raw ? (JSON.parse(raw) as { error?: string }) : null;
          if (parsed?.error) message = parsed.error;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      onRegenerated();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  }

  const nextVersionLabel = formatPolicyVersion(currentVersion + 1);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject and regenerate?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                The current AI draft of <strong>{displayTitle}</strong> will be
                discarded and replaced with a new draft ({nextVersionLabel}).
              </p>
              <p>
                Any edits you made are lost. Review the new draft before
                approving.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={submitting}
            onClick={() => void confirm()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Regenerating…
              </>
            ) : (
              "Reject & regenerate"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
