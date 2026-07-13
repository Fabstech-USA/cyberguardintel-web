import Link from "next/link";

import { Button } from "@/components/ui/button";

type PlanLimitUpgradePromptProps = {
  /** Shown when used/limit are known (e.g. from API 403). */
  used?: number;
  limit?: number;
  /** Override the default message body. */
  message?: string;
  className?: string;
};

export function PlanLimitUpgradePrompt({
  used,
  limit,
  message,
  className,
}: PlanLimitUpgradePromptProps) {
  const body =
    message ??
    (typeof used === "number" && typeof limit === "number"
      ? `Integration limit reached (${used}/${limit}). Upgrade your plan to connect more.`
      : "Integration limit reached. Upgrade your plan to connect more.");

  return (
    <div
      className={
        className ??
        "flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
      }
      role="alert"
    >
      <p>{body}</p>
      <Button variant="outline" size="sm" className="shrink-0" asChild>
        <Link href="/settings/billing">Upgrade</Link>
      </Button>
    </div>
  );
}
