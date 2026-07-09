"use client";

import Link from "next/link";

import { EvidenceFreshnessPill } from "@/components/evidence/EvidenceFreshnessPill";
import { Button } from "@/components/ui/button";
import type { EvidenceListItem } from "@/lib/evidence-queries";
import { formatRelativeShort } from "@/lib/integration-detail";

type EvidenceTabProps = {
  items: EvidenceListItem[];
  totalCount: number;
  evidenceBrowserHref: string;
};

export function EvidenceTab({
  items,
  totalCount,
  evidenceBrowserHref,
}: EvidenceTabProps) {
  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">Recent evidence</h3>
          <p className="text-[11.5px] text-muted-foreground">
            Latest {items.length} items collected. View all {totalCount} in the
            evidence browser.
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-[11.5px]" asChild>
          <Link href={evidenceBrowserHref}>View all in evidence browser →</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No evidence collected from this integration yet.
        </p>
      ) : (
        <div>
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-1 gap-2 border-b px-4 py-2.5 text-xs last:border-b-0 sm:grid-cols-[minmax(0,1fr)_90px_100px_80px] sm:items-center sm:gap-3"
            >
              <div className="min-w-0">
                <div className="truncate text-[12.5px] font-medium">
                  {item.title}
                </div>
                {item.description ? (
                  <div className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
                    {item.description}
                  </div>
                ) : null}
              </div>
              <div className="font-mono text-[10.5px] text-muted-foreground">
                {item.controlRef}
              </div>
              <div>
                <EvidenceFreshnessPill tier={item.freshnessTier} />
              </div>
              <div className="tabular-nums text-muted-foreground">
                {formatRelativeShort(item.collectedAt)} ago
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
