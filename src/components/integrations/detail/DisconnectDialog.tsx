"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canConfirmDisconnect } from "@/lib/integration-detail";

type DisconnectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integrationName: string;
  evidenceCount: number;
  controls: string[];
  onConfirm: () => Promise<void>;
};

export function DisconnectDialog({
  open,
  onOpenChange,
  integrationName,
  evidenceCount,
  controls,
  onConfirm,
}: DisconnectDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canConfirm = canConfirmDisconnect(confirmText);

  async function handleConfirm() {
    if (!canConfirm || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm();
      setConfirmText("");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setConfirmText("");
          setError(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-[10px] bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400">
            <AlertTriangle className="size-[18px]" />
          </div>
          <DialogTitle>Disconnect {integrationName}?</DialogTitle>
          <DialogDescription className="text-[12.5px] leading-relaxed">
            This will stop evidence collection and delete stored credentials. You
            can reconnect anytime, but you&apos;ll need to re-authorize access.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-muted/60 px-3.5 py-3">
          <p className="mb-1.5 text-[11.5px] font-medium">What happens next</p>
          <ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
            <li>
              <strong className="font-medium text-foreground">
                {evidenceCount} existing evidence{" "}
                {evidenceCount === 1 ? "item" : "items"}
              </strong>{" "}
              stay in your library but will start aging out of freshness windows.
            </li>
            <li>
              <strong className="font-medium text-foreground">
                Your HIPAA readiness score may drop
              </strong>{" "}
              over the next 30 days as evidence expires without a replacement
              source.
            </li>
            {controls.length > 0 ? (
              <li>
                <strong className="font-medium text-foreground">
                  Controls {controls.join(", ")}
                </strong>{" "}
                will need alternative evidence sources.
              </li>
            ) : null}
            <li>
              <strong className="font-medium text-foreground">
                Credentials are purged
              </strong>{" "}
              within 60 seconds per 164.312(a)(2)(iv).
            </li>
          </ul>
        </div>

        <div className="space-y-2">
          <Label htmlFor="disconnect-confirm" className="text-[12.5px]">
            Type{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11.5px]">
              DISCONNECT
            </code>{" "}
            to confirm
          </Label>
          <Input
            id="disconnect-confirm"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder="Type to confirm"
            autoComplete="off"
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter className="gap-2 sm:justify-end">
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
            variant="destructive"
            disabled={!canConfirm || submitting}
            onClick={() => void handleConfirm()}
          >
            {submitting ? "Disconnecting…" : `Disconnect ${integrationName}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
