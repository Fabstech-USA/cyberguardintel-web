"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Search } from "lucide-react";

import { EvidenceCard } from "@/components/shared/EvidenceCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EvidenceListItem } from "@/lib/evidence-queries";

type EvidenceSearchCommandProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: EvidenceListItem) => void;
  onApplySearch: (query: string) => void;
};

export function EvidenceSearchCommand({
  open,
  onOpenChange,
  onSelect,
  onApplySearch,
}: EvidenceSearchCommandProps) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<EvidenceListItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setItems([]);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handle = window.setTimeout(async () => {
      const trimmed = query.trim();
      if (!trimmed) {
        setItems([]);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({ q: trimmed, limit: "20" });
        const res = await fetch(`/api/evidence?${params.toString()}`);
        if (!res.ok) throw new Error("Search failed");
        const body = (await res.json()) as { items: EvidenceListItem[] };
        setItems(body.items ?? []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [open, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>Search evidence</DialogTitle>
          <DialogDescription>
            Search by title or HIPAA control reference
          </DialogDescription>
        </DialogHeader>
        <Command shouldFilter={false} className="rounded-lg border-0">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 size-4 shrink-0 opacity-50" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search by title or control reference…"
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none"
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching…
              </div>
            ) : null}
            {!loading && query.trim() && items.length === 0 ? (
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                No evidence found.
              </Command.Empty>
            ) : null}
            {items.map((item) => (
              <Command.Item
                key={item.id}
                value={item.id}
                onSelect={() => {
                  onSelect(item);
                  onOpenChange(false);
                }}
                className="cursor-pointer rounded-md px-2 py-2 aria-selected:bg-accent"
              >
                <EvidenceCard item={item} compact />
              </Command.Item>
            ))}
            {!loading && query.trim() ? (
              <Command.Item
                value={`apply-${query}`}
                onSelect={() => {
                  onApplySearch(query.trim());
                  onOpenChange(false);
                }}
                className="mt-1 cursor-pointer rounded-md border-t px-2 py-2 text-sm text-muted-foreground aria-selected:bg-accent"
              >
                Apply search filter for &quot;{query.trim()}&quot;
              </Command.Item>
            ) : null}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
