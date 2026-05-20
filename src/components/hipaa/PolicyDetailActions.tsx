"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Policy } from "@/generated/prisma";
import { PolicyStatus } from "@/generated/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PolicyApproveDialog } from "@/components/hipaa/PolicyApproveDialog";
import { PolicyRegenerateDialog } from "@/components/hipaa/PolicyRegenerateDialog";
import {
  POLICY_STATUS_LABELS,
  canApprovePolicyStatus,
  getAllowedPolicyTransitions,
} from "@/lib/hipaa-policy-status";

type Props = {
  policy: Policy;
  displayTitle: string;
  allowedTransitions: PolicyStatus[];
  canManagePolicies: boolean;
};

function statusBadgeVariant(
  status: PolicyStatus
): "default" | "secondary" | "outline" {
  if (status === PolicyStatus.APPROVED) return "default";
  if (status === PolicyStatus.UNDER_REVIEW) return "secondary";
  return "outline";
}

export function PolicyDetailActions({
  policy: initialPolicy,
  displayTitle,
  allowedTransitions: initialTransitions,
  canManagePolicies,
}: Props): React.JSX.Element {
  const router = useRouter();
  const [policy, setPolicy] = useState(initialPolicy);
  const [allowedTransitions, setAllowedTransitions] =
    useState(initialTransitions);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);

  const transitionOptions = [
    policy.status,
    ...allowedTransitions.filter((s) => s !== policy.status),
  ];

  const showApprove =
    canManagePolicies && canApprovePolicyStatus(policy.status);

  async function changeStatus(next: PolicyStatus): Promise<void> {
    if (next === policy.status) return;
    setStatusSaving(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/hipaa/policies/${policy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const raw = await res.text();
      if (!res.ok) {
        let message = `Failed to update status (${res.status})`;
        try {
          const parsed = raw ? (JSON.parse(raw) as { error?: string }) : null;
          if (parsed?.error) message = parsed.error;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }
      const updated = JSON.parse(raw) as Policy;
      setPolicy(updated);
      setAllowedTransitions(getAllowedPolicyTransitions(updated.status));
      router.refresh();
    } catch (err) {
      setStatusError(
        err instanceof Error ? err.message : "Could not update status."
      );
    } finally {
      setStatusSaving(false);
    }
  }

  function onApproved(updated: Policy): void {
    setPolicy(updated);
    setAllowedTransitions(getAllowedPolicyTransitions(updated.status));
    router.refresh();
  }

  if (!canManagePolicies) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusBadgeVariant(policy.status)}>
          {POLICY_STATUS_LABELS[policy.status]}
        </Badge>
        {policy.approvedAt ? (
          <span className="text-muted-foreground text-xs">
            Approved {format(new Date(policy.approvedAt), "MMM d, yyyy")}
            {policy.reviewDate
              ? ` · Review by ${format(new Date(policy.reviewDate), "MMM d, yyyy")}`
              : ""}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="bg-card flex flex-col gap-4 rounded-xl border border-border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Status</span>
            <Select
              value={policy.status}
              onValueChange={(v) => void changeStatus(v as PolicyStatus)}
              disabled={statusSaving || transitionOptions.length <= 1}
            >
              <SelectTrigger className="w-[180px]" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {transitionOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {POLICY_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {statusSaving ? (
              <span className="text-muted-foreground text-xs">Saving…</span>
            ) : null}
          </div>
          {policy.approvedAt && policy.status === PolicyStatus.APPROVED ? (
            <span className="text-muted-foreground text-xs">
              Effective {format(new Date(policy.approvedAt), "MMM d, yyyy")}
              {policy.reviewDate
                ? ` · Review by ${format(new Date(policy.reviewDate), "MMM d, yyyy")}`
                : ""}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setRegenerateOpen(true)}
          >
            Regenerate
          </Button>
          {showApprove ? (
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => setApproveOpen(true)}
            >
              Approve policy
            </Button>
          ) : null}
        </div>
      </div>

      {statusError ? (
        <p role="alert" className="text-destructive text-sm">
          {statusError}
        </p>
      ) : null}

      <PolicyApproveDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        policyId={policy.id}
        version={policy.version}
        title={policy.title}
        onApproved={onApproved}
      />

      <PolicyRegenerateDialog
        open={regenerateOpen}
        onOpenChange={setRegenerateOpen}
        policyType={policy.type}
        displayTitle={displayTitle}
        currentVersion={policy.version}
        onRegenerated={() => router.refresh()}
      />
    </div>
  );
}
