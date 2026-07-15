"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { FileText } from "lucide-react";

import { EvidenceFreshnessPill } from "@/components/evidence/EvidenceFreshnessPill";
import { EvidenceHashCell } from "@/components/evidence/EvidenceHashCell";
import { EvidenceSourceBadge } from "@/components/evidence/EvidenceSourceBadge";
import { HelpTip } from "@/components/shared/HelpTip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EvidenceListItem } from "@/lib/evidence-queries";
import { cn } from "@/lib/utils";

type EvidenceTableProps = {
  items: EvidenceListItem[];
  loading?: boolean;
  onDownload: (item: EvidenceListItem) => void;
  downloadingId?: string | null;
  className?: string;
};

function formatEvidenceType(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/_/g, " ");
}

export function EvidenceTable({
  items,
  loading = false,
  onDownload,
  downloadingId,
  className,
}: EvidenceTableProps) {
  const [viewItem, setViewItem] = useState<EvidenceListItem | null>(null);

  if (loading) {
    return (
      <div className={cn("py-12 text-center text-sm text-muted-foreground", className)}>
        Loading evidence…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn("py-12 text-center text-sm text-muted-foreground", className)}>
        No evidence matches your filters.
      </div>
    );
  }

  return (
    <>
      <div className={cn("overflow-x-auto", className)}>
        <table className="w-full table-fixed border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-[10.5px] font-medium text-muted-foreground">
              <th className="w-[30%] px-3 py-2">Evidence</th>
              <th className="w-[12%] px-3 py-2">Source</th>
              <th className="w-[14%] px-3 py-2">Control</th>
              <th className="w-[10%] px-3 py-2">
                <span className="inline-flex items-center gap-1">
                  Freshness
                  <HelpTip
                    label="About freshness"
                    content="Freshness tracks whether evidence is still within its collection window. Stale means the window expired. Auditors may flag it."
                  />
                </span>
              </th>
              <th className="w-[12%] px-3 py-2">Collected</th>
              <th className="w-[12%] px-3 py-2">Integrity</th>
              <th className="w-[10%] px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const integrityVerified = Boolean(item.fileHash && item.s3Key);
              return (
                <tr
                  key={item.id}
                  id={`evidence-row-${item.id}`}
                  className="border-b align-top"
                >
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-[12.5px]">{item.title}</div>
                    {item.description ? (
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {item.description}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <EvidenceSourceBadge badge={item.sourceBadge} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-mono text-[10.5px] text-muted-foreground">
                      {item.controlRef}
                    </div>
                    {item.evidenceType ? (
                      <div className="text-[10.5px] capitalize text-muted-foreground">
                        {formatEvidenceType(item.evidenceType)}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5">
                    <EvidenceFreshnessPill tier={item.freshnessTier} />
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-[11px] text-muted-foreground">
                    {format(parseISO(item.collectedAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-3 py-2.5">
                    <EvidenceHashCell
                      fileHash={item.fileHash}
                      verified={integrityVerified}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => setViewItem(item)}
                      >
                        View
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        disabled={!item.s3Key || downloadingId === item.id}
                        onClick={() => onDownload(item)}
                      >
                        <FileText className="mr-1 size-3" />
                        {downloadingId === item.id ? "…" : "PDF"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={viewItem !== null} onOpenChange={(open) => !open && setViewItem(null)}>
        <DialogContent className="max-w-lg">
          {viewItem ? (
            <>
              <DialogHeader>
                <DialogTitle>{viewItem.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                {viewItem.description ? (
                  <p className="text-muted-foreground">{viewItem.description}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <EvidenceSourceBadge badge={viewItem.sourceBadge} />
                  <EvidenceFreshnessPill tier={viewItem.freshnessTier} />
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  <dt className="text-muted-foreground">Control</dt>
                  <dd className="font-mono">{viewItem.controlRef}</dd>
                  <dt className="text-muted-foreground">Collected</dt>
                  <dd>{format(parseISO(viewItem.collectedAt), "MMM d, yyyy")}</dd>
                  <dt className="text-muted-foreground">SHA-256</dt>
                  <dd className="break-all font-mono">{viewItem.fileHash ?? "—"}</dd>
                </dl>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
