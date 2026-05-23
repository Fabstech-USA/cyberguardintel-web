"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { PolicyType } from "@/generated/prisma";
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
import { regeneratePoliciesViaStream } from "@/lib/regenerate-policy-client";
import { formatPolicyVersion } from "@/lib/hipaa-policy-version";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policyType: PolicyType;
  displayTitle: string;
  currentVersion: number;
  onRegenerated: () => void;
};

export function PolicyRegenerateDialog({
  open,
  onOpenChange,
  policyType,
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
      await regeneratePoliciesViaStream([policyType]);
      onRegenerated();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setSubmitting(false);
    }
  }

  const nextVersionLabel = formatPolicyVersion(currentVersion + 1);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Regenerate policy?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                A new AI draft of <strong>{displayTitle}</strong> will replace
                the current document and become{" "}
                <strong>{nextVersionLabel}</strong> (now{" "}
                {formatPolicyVersion(currentVersion)}).
              </p>
              <p>
                Status returns to <strong>Draft</strong>. Any approval and
                manual edits are discarded. Review the new draft before approving
                again.
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
            disabled={submitting}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => void confirm()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Regenerating…
              </>
            ) : (
              `Regenerate as ${nextVersionLabel}`
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
