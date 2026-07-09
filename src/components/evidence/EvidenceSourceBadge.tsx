import type { EvidenceSourceBadge } from "@/lib/evidence-source";
import { cn } from "@/lib/utils";

type EvidenceSourceBadgeProps = {
  badge: EvidenceSourceBadge;
  className?: string;
};

export function EvidenceSourceBadge({ badge, className }: EvidenceSourceBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-[10.5px] font-medium",
        className
      )}
      style={{ backgroundColor: badge.bg, color: badge.fg }}
    >
      {badge.label}
    </span>
  );
}
