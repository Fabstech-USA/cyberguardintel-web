"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { AlertTriangle, RefreshCw, Search, Upload } from "lucide-react";

import { EvidenceSearchCommand } from "@/components/evidence/EvidenceSearchCommand";
import { EvidenceTable } from "@/components/evidence/EvidenceTable";
import { HipaaStatCard } from "@/components/hipaa/HipaaStatCard";
import { hipaaStatUi } from "@/components/hipaa/hipaa-stat-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EVIDENCE_SOURCE_CHIP_OPTIONS } from "@/lib/evidence-source";
import type { EvidenceListItem } from "@/lib/evidence-queries";
import { cn } from "@/lib/utils";

type EvidenceStats = {
  total: number;
  fresh: number;
  stale: number;
  integrityVerified: number;
  lastSyncAt: string | null;
};

type FiltersState = {
  source: string;
  controlRef: string;
  freshness: string;
  from: string;
  to: string;
  q: string;
  limit: number;
};

const DEFAULT_FILTERS: FiltersState = {
  source: "all",
  controlRef: "all",
  freshness: "all",
  from: "",
  to: "",
  q: "",
  limit: 50,
};

type ListResponse = {
  items: EvidenceListItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

function buildQueryParams(
  filters: FiltersState,
  cursor?: string | null
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.source !== "all") params.set("source", filters.source);
  if (filters.controlRef !== "all") params.set("controlRef", filters.controlRef);
  if (filters.freshness !== "all") params.set("freshness", filters.freshness);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.q.trim()) params.set("q", filters.q.trim());
  params.set("limit", String(filters.limit));
  if (cursor) params.set("cursor", cursor);
  return params;
}

export function EvidenceBrowserClient() {
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [items, setItems] = useState<EvidenceListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [controlRefs, setControlRefs] = useState<string[]>([]);
  const [stats, setStats] = useState<EvidenceStats>({
    total: 0,
    fresh: 0,
    stale: 0,
    integrityVerified: 0,
    lastSyncAt: null,
  });
  const [commandOpen, setCommandOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/evidence/stats");
      if (res.ok) {
        setStats((await res.json()) as EvidenceStats);
      }
    } catch {
      /* stats are best-effort */
    }
  }, []);

  const fetchPage = useCallback(async (cursor: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildQueryParams(filters, cursor);
      const res = await fetch(`/api/evidence?${params.toString()}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(
          typeof body.error === "string" ? body.error : "Failed to load evidence"
        );
      }
      const body = (await res.json()) as ListResponse;
      setItems(body.items);
      setNextCursor(body.nextCursor);
      setHasMore(body.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load evidence");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    setPageIndex(0);
    setPageCursors([null]);
    void fetchPage(null);
  }, [fetchPage]);

  useEffect(() => {
    void fetchStats();
    void (async () => {
      try {
        const controlsRes = await fetch("/api/evidence/controls");
        if (controlsRes.ok) {
          const body = (await controlsRes.json()) as { controlRefs: string[] };
          setControlRefs(body.controlRefs ?? []);
        }
      } catch {
        /* best-effort */
      }
    })();
  }, [fetchStats]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filterPillClass = (active: boolean) =>
    cn(
      "rounded-full border px-2.5 py-1 text-[11.5px] transition-colors",
      active
        ? "border-foreground bg-foreground text-background"
        : "border-border text-muted-foreground hover:text-foreground"
    );

  const showingLabel = useMemo(() => {
    if (loading) return "Loading…";
    const base = `Showing ${items.length} of ${stats.total} item${stats.total === 1 ? "" : "s"}`;
    if (stats.lastSyncAt) {
      const ago = formatDistanceToNow(parseISO(stats.lastSyncAt));
      return `${base} · Last sync: ${ago} ago`;
    }
    return base;
  }, [items.length, loading, stats.total, stats.lastSyncAt]);

  async function handleDownload(item: EvidenceListItem) {
    if (!item.s3Key) return;
    setDownloadingId(item.id);
    try {
      const res = await fetch(`/api/evidence/${item.id}/download`);
      if (res.status === 409) {
        throw new Error("Integrity check failed — file hash mismatch");
      }
      if (!res.ok) {
        throw new Error("Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = item.title.replace(/[^a-zA-Z0-9._-]+/g, "_") || "evidence";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingId(null);
    }
  }

  function handleSelectFromCommand(item: EvidenceListItem) {
    setFilters((prev) => ({ ...prev, q: item.title }));
    const row = document.getElementById(`evidence-row-${item.id}`);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Evidence browser</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            All compliance evidence collected from integrations and manual uploads.
            Filter by source, control, and freshness. Every file is SHA-256 hashed
            for HIPAA integrity per 164.312(c)(1).
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href="/integrations">
              <RefreshCw className="mr-2 size-4" />
              Sync now
            </Link>
          </Button>
          <Button type="button" variant="outline" onClick={() => setCommandOpen(true)}>
            <Search className="mr-2 size-4" />
            Search
            <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
              ⌘K
            </span>
          </Button>
          <Button asChild>
            <Link href="/evidence/upload">
              <Upload className="mr-2 size-4" />
              Upload evidence
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HipaaStatCard label="Total evidence" value={String(stats.total)} />
        <HipaaStatCard
          label="Fresh"
          value={String(stats.fresh)}
          valueClassName={hipaaStatUi.statOk}
        />
        <HipaaStatCard
          label="Stale"
          value={String(stats.stale)}
          valueClassName={
            stats.stale > 0 ? hipaaStatUi.statDanger : hipaaStatUi.statOk
          }
        />
        <HipaaStatCard
          label="Integrity verified"
          value={`${stats.integrityVerified}/${stats.total}`}
          valueClassName={
            stats.integrityVerified < stats.total
              ? hipaaStatUi.statWarn
              : hipaaStatUi.statOk
          }
        />
      </div>

      {stats.stale > 0 ? (
        <Alert variant="warning">
          <AlertTriangle className="size-5" />
          <AlertDescription>
            {stats.stale} evidence item{stats.stale === 1 ? "" : "s"} ha
            {stats.stale === 1 ? "s" : "ve"} expired freshness windows. Stale
            evidence may be flagged during audit. Re-collect or manually upload a
            current version.
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <Input
              value={filters.q}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, q: event.target.value }))
              }
              placeholder="Search by title or control reference…"
              className="lg:max-w-md"
            />
            <div className="flex flex-wrap gap-1">
              {EVIDENCE_SOURCE_CHIP_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={filterPillClass(filters.source === option.key)}
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, source: option.key }))
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Select
              value={filters.controlRef}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, controlRef: value }))
              }
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Control reference" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All controls</SelectItem>
                {controlRefs.map((ref) => (
                  <SelectItem key={ref} value={ref}>
                    {ref}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.freshness}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, freshness: value }))
              }
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Freshness" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All freshness</SelectItem>
                <SelectItem value="fresh">Fresh</SelectItem>
                <SelectItem value="expiring">Expiring</SelectItem>
                <SelectItem value="stale">Stale</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={filters.from}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, from: event.target.value }))
              }
              className="w-full sm:w-[160px]"
              aria-label="Collected from"
            />
            <Input
              type="date"
              value={filters.to}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, to: event.target.value }))
              }
              className="w-full sm:w-[160px]"
              aria-label="Collected to"
            />

            <Select
              value={String(filters.limit)}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, limit: Number(value) }))
              }
            >
              <SelectTrigger className="w-full sm:w-[120px]">
                <SelectValue placeholder="Page size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 rows</SelectItem>
                <SelectItem value="100">100 rows</SelectItem>
                <SelectItem value="200">200 rows</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          <EvidenceTable
            items={items}
            loading={loading}
            onDownload={handleDownload}
            downloadingId={downloadingId}
          />

          <div className="flex items-center justify-between border-t pt-3 text-[11.5px] text-muted-foreground">
            <span>{showingLabel}</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || pageIndex === 0}
                onClick={() => {
                  const newIndex = pageIndex - 1;
                  setPageIndex(newIndex);
                  void fetchPage(pageCursors[newIndex] ?? null);
                }}
              >
                Prev
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || !hasMore || !nextCursor}
                onClick={() => {
                  if (!nextCursor) return;
                  const newIndex = pageIndex + 1;
                  setPageCursors((prev) => {
                    const next = [...prev];
                    next[newIndex] = nextCursor;
                    return next;
                  });
                  setPageIndex(newIndex);
                  void fetchPage(nextCursor);
                }}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <EvidenceSearchCommand
        open={commandOpen}
        onOpenChange={setCommandOpen}
        onSelect={handleSelectFromCommand}
        onApplySearch={(query) => setFilters((prev) => ({ ...prev, q: query }))}
      />
    </div>
  );
}
