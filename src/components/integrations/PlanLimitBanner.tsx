import Link from "next/link";

import type { PlanType } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatIntegrationLimit } from "@/lib/integration-limits";
import { formatPlanLabel } from "@/lib/plan-display";

type PlanLimitBannerProps = {
  plan: PlanType;
  connectedCount: number;
  planLimit: number;
  erroredCount?: number;
  totalEvidence?: number;
};

export function PlanLimitBanner({
  plan,
  connectedCount,
  planLimit,
  erroredCount = 0,
  totalEvidence = 0,
}: PlanLimitBannerProps) {
  const finiteLimit = Number.isFinite(planLimit);
  const usagePercent = finiteLimit
    ? Math.min(100, Math.round((connectedCount / planLimit) * 100))
    : 0;

  return (
    <div className="mb-3.5 flex flex-col gap-3 rounded-lg bg-muted/50 px-3.5 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between">
      <div>
        <strong>{formatPlanLabel(plan)} plan</strong>
        {" · "}
        {connectedCount} of {formatIntegrationLimit(planLimit)} integrations connected
        {erroredCount > 0 ? (
          <>
            {" · "}
            <span className="text-destructive">{erroredCount} need attention</span>
          </>
        ) : null}
        {totalEvidence > 0 ? (
          <>
            {" · "}
            {totalEvidence} evidence items today
          </>
        ) : null}
      </div>
      <div className="flex items-center gap-2.5">
        {finiteLimit ? (
          <Progress
            value={usagePercent}
            className="h-1.5 w-28"
            indicatorClassName="bg-emerald-500"
          />
        ) : null}
        <Button variant="outline" size="sm" asChild>
          <Link href="/settings/billing">Upgrade</Link>
        </Button>
      </div>
    </div>
  );
}
