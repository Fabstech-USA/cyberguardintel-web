import type { FreshnessTier } from "@/lib/evidence-freshness";
import { getFreshnessLabel } from "@/lib/evidence-freshness";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TIER_CLASS: Record<FreshnessTier, string> = {
  fresh: "border-emerald-200 bg-emerald-50 text-emerald-800",
  expiring: "border-amber-200 bg-amber-50 text-amber-800",
  stale: "border-red-200 bg-red-50 text-red-800",
};

type EvidenceFreshnessPillProps = {
  tier: FreshnessTier;
  className?: string;
};

export function EvidenceFreshnessPill({
  tier,
  className,
}: EvidenceFreshnessPillProps) {
  return (
    <Badge variant="outline" className={cn(TIER_CLASS[tier], className)}>
      {getFreshnessLabel(tier)}
    </Badge>
  );
}
