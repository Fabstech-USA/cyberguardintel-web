"use client";

import type { EvidenceListItem } from "@/lib/evidence-queries";
import { EvidenceFreshnessPill } from "@/components/evidence/EvidenceFreshnessPill";
import { EvidenceHashCell } from "@/components/evidence/EvidenceHashCell";
import { EvidenceSourceBadge } from "@/components/evidence/EvidenceSourceBadge";
import { cn } from "@/lib/utils";

type EvidenceCardProps = {
  item: EvidenceListItem;
  compact?: boolean;
  className?: string;
};

export function EvidenceCard({ item, compact = false, className }: EvidenceCardProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-medium text-sm">{item.title}</div>
        <EvidenceSourceBadge badge={item.sourceBadge} />
        <EvidenceFreshnessPill tier={item.freshnessTier} />
      </div>
      {!compact && item.description ? (
        <p className="text-xs text-muted-foreground">{item.description}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-mono">{item.controlRef}</span>
        <EvidenceHashCell fileHash={item.fileHash} />
      </div>
    </div>
  );
}
