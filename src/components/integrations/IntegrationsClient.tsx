"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { IntegrationStatus, PlanType } from "@/generated/prisma";
import { ConnectedIntegrationRow } from "@/components/integrations/ConnectedIntegrationRow";
import { IntegrationCard } from "@/components/shared/IntegrationCard";
import { IntegrationDetailDrawer } from "@/components/integrations/IntegrationDetailDrawer";
import { PlanLimitBanner } from "@/components/integrations/PlanLimitBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { IntegrationPublicDto } from "@/lib/integration-api";
import {
  countCatalogByCategory,
  filterCatalog,
  getCatalogEntry,
  groupAvailableByCategory,
  INTEGRATION_CATALOG,
  INTEGRATION_CATEGORIES,
  matchesCatalogSearch,
  type IntegrationCatalogEntry,
  type IntegrationCategoryFilter,
} from "@/lib/integration-catalog";
import { ENTERPRISE_SALES_EMAIL } from "@/lib/plans";
import { cn } from "@/lib/utils";

type IntegrationsClientProps = {
  connectedIntegrations: IntegrationPublicDto[];
  organizationPlan: PlanType;
  planLimit: number;
};

const CONNECTED_STATUSES: IntegrationStatus[] = ["ACTIVE", "PAUSED", "ERROR"];

type AvailabilityFilter = "all" | "connectable" | "coming-soon";

const STATUS_FILTERS: {
  id: Exclude<AvailabilityFilter, "all">;
  label: string;
}[] = [
  { id: "connectable", label: "Ready to connect" },
  { id: "coming-soon", label: "Coming soon" },
];

const CATEGORY_PILLS = INTEGRATION_CATEGORIES.filter((pill) => pill.id !== "all");

function filterPillClass(active: boolean): string {
  return cn(
    "rounded-full border px-2.5 py-1 text-[11.5px] whitespace-nowrap transition-colors",
    active
      ? "border-foreground bg-foreground text-background"
      : "border-border bg-transparent text-muted-foreground hover:bg-muted/50"
  );
}

function matchesAvailabilityFilter(
  entry: IntegrationCatalogEntry,
  filter: AvailabilityFilter
): boolean {
  if (filter === "all") return true;
  if (filter === "connectable") return entry.connectable;
  return !entry.connectable;
}

export function IntegrationsClient({
  connectedIntegrations,
  organizationPlan,
  planLimit,
}: IntegrationsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<IntegrationCategoryFilter>("all");
  const [drawerEntry, setDrawerEntry] = useState<IntegrationCatalogEntry | null>(
    null
  );
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>("all");

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) {
      const entry = getCatalogEntry(connected);
      setBannerMessage(
        entry ? `${entry.name} connected successfully.` : "Integration connected."
      );
    } else if (error === "integration_limit_reached") {
      setBannerMessage("Integration limit reached. Upgrade your plan to connect more.");
    }
  }, [searchParams]);

  const activeConnected = useMemo(
    () =>
      connectedIntegrations.filter((integration) =>
        CONNECTED_STATUSES.includes(integration.status)
      ),
    [connectedIntegrations]
  );

  const connectedTypes = useMemo(
    () => new Set(activeConnected.map((integration) => integration.type)),
    [activeConnected]
  );

  const filteredCatalog = useMemo(
    () => filterCatalog(INTEGRATION_CATALOG, { search, category }),
    [search, category]
  );

  const connectedRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return activeConnected
      .map((integration) => {
        const entry = getCatalogEntry(integration.type);
        return { integration, entry };
      })
      .filter(({ integration, entry }) => {
        if (!entry) return needle.length === 0;
        return (
          integration.displayName.toLowerCase().includes(needle) ||
          entry.description.toLowerCase().includes(needle) ||
          entry.controls.some((control) => control.toLowerCase().includes(needle))
        );
      });
  }, [activeConnected, search]);

  const unconnectedCatalog = useMemo(
    () => filteredCatalog.filter((entry) => !connectedTypes.has(entry.id)),
    [filteredCatalog, connectedTypes]
  );

  const unconnectedMatchingCategory = useMemo(() => {
    return INTEGRATION_CATALOG.filter(
      (entry) =>
        !connectedTypes.has(entry.id) &&
        matchesCatalogSearch(entry, search) &&
        (category === "all" || entry.category === category)
    );
  }, [connectedTypes, search, category]);

  const allFilterCount = useMemo(
    () =>
      INTEGRATION_CATALOG.filter(
        (entry) =>
          !connectedTypes.has(entry.id) && matchesCatalogSearch(entry, search)
      ).length,
    [connectedTypes, search]
  );

  const statusCounts = useMemo(
    () => ({
      connectable: unconnectedMatchingCategory.filter((entry) => entry.connectable)
        .length,
      "coming-soon": unconnectedMatchingCategory.filter(
        (entry) => !entry.connectable
      ).length,
    }),
    [unconnectedMatchingCategory]
  );

  const isAllFilterActive =
    availabilityFilter === "all" && category === "all";

  const catalogCounts = useMemo(() => {
    const pool = INTEGRATION_CATALOG.filter(
      (entry) =>
        !connectedTypes.has(entry.id) &&
        matchesCatalogSearch(entry, search) &&
        matchesAvailabilityFilter(entry, availabilityFilter)
    );
    return countCatalogByCategory(pool);
  }, [connectedTypes, search, availabilityFilter]);

  const availableEntries = useMemo(() => {
    return unconnectedCatalog.filter((entry) =>
      matchesAvailabilityFilter(entry, availabilityFilter)
    );
  }, [unconnectedCatalog, availabilityFilter]);

  const groupedAvailable = useMemo(() => {
    if (category !== "all" || search.trim()) {
      return null;
    }
    return groupAvailableByCategory(availableEntries);
  }, [availableEntries, category, search]);

  const erroredCount = activeConnected.filter(
    (integration) => integration.status === "ERROR"
  ).length;
  const totalEvidence = activeConnected.reduce(
    (sum, integration) => sum + integration.lastSyncCount,
    0
  );

  const syncIntegration = useCallback(
    async (id: string) => {
      setSyncingId(id);
      try {
        const response = await fetch(`/api/integrations/sync/${id}`, {
          method: "POST",
        });
        if (response.ok) {
          router.refresh();
        }
      } finally {
        setSyncingId(null);
      }
    },
    [router]
  );

  const syncAll = useCallback(async () => {
    const syncable = activeConnected.filter(
      (integration) => integration.status === "ACTIVE"
    );
    if (syncable.length === 0) return;

    setSyncingAll(true);
    try {
      await Promise.all(
        syncable.map((integration) =>
          fetch(`/api/integrations/sync/${integration.id}`, { method: "POST" })
        )
      );
      router.refresh();
    } finally {
      setSyncingAll(false);
    }
  }, [activeConnected, router]);

  return (
    <main className="flex w-full flex-1 flex-col gap-5 p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Connect your tools to collect evidence automatically. Every integration
            maps to specific HIPAA controls and syncs every 24 hours.
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" asChild>
          <a
            href={`mailto:${ENTERPRISE_SALES_EMAIL}?subject=${encodeURIComponent("Integration request")}`}
          >
            Request integration
          </a>
        </Button>
      </div>

      {bannerMessage ? (
        <div className="rounded-md border border-emerald-600/30 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">
          {bannerMessage}
        </div>
      ) : null}

      <PlanLimitBanner
        plan={organizationPlan}
        connectedCount={activeConnected.length}
        planLimit={planLimit}
        erroredCount={erroredCount}
        totalEvidence={totalEvidence}
      />

      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`Search ${INTEGRATION_CATALOG.length} integrations by name, description, or HIPAA control (e.g. 164.312(b))`}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => {
            setAvailabilityFilter("all");
            setCategory("all");
          }}
          className={filterPillClass(isAllFilterActive)}
        >
          All
          <span className="ml-1 opacity-55 tabular-nums">{allFilterCount}</span>
        </button>
        {STATUS_FILTERS.map((pill) => (
          <button
            key={`status-${pill.id}`}
            type="button"
            onClick={() => {
              setAvailabilityFilter(pill.id);
              setCategory("all");
            }}
            className={filterPillClass(availabilityFilter === pill.id)}
          >
            {pill.label}
            <span className="ml-1 opacity-55 tabular-nums">
              {statusCounts[pill.id]}
            </span>
          </button>
        ))}
        {CATEGORY_PILLS.map((pill) => (
          <button
            key={`category-${pill.id}`}
            type="button"
            onClick={() => {
              setCategory(pill.id);
              setAvailabilityFilter("all");
            }}
            className={filterPillClass(category === pill.id)}
          >
            {pill.label}
            <span className="ml-1 opacity-55 tabular-nums">
              {catalogCounts[pill.id]}
            </span>
          </button>
        ))}
      </div>

      {connectedRows.length > 0 ? (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium">
              Connected{" "}
              <span className="font-normal text-muted-foreground">
                {connectedRows.length}
              </span>
            </h2>
            <Button
              variant="link"
              size="sm"
              className="h-auto px-0 text-xs text-muted-foreground"
              disabled={syncingAll}
              onClick={() => void syncAll()}
            >
              Sync all
            </Button>
          </div>
          <div className="overflow-hidden rounded-lg border">
            {connectedRows.map(({ integration, entry }) => (
              <ConnectedIntegrationRow
                key={integration.id}
                integration={integration}
                entry={entry}
                onSync={(id) => void syncIntegration(id)}
                syncing={syncingId === integration.id || syncingAll}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-medium">
            Available{" "}
            <span className="font-normal text-muted-foreground">
              {availableEntries.length}
            </span>
          </h2>
        </div>

        {availableEntries.length > 0 ? (
          groupedAvailable ? (
            groupedAvailable.map((group) => (
              <div key={group.category} className="mb-4">
                <p className="mb-2 flex items-center gap-2 px-0.5 text-[11px] font-medium text-muted-foreground uppercase">
                  {group.label} · {group.entries.length}
                  <span className="h-px flex-1 bg-border" />
                </p>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
                  {group.entries.map((entry) => (
                    <IntegrationCard
                      key={entry.id}
                      entry={entry}
                      onClick={() => setDrawerEntry(entry)}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
              {availableEntries.map((entry) => (
                <IntegrationCard
                  key={entry.id}
                  entry={entry}
                  onClick={() => setDrawerEntry(entry)}
                />
              ))}
            </div>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            No integrations match this filter.
          </p>
        )}
      </section>

      <IntegrationDetailDrawer
        entry={drawerEntry}
        open={drawerEntry !== null}
        onOpenChange={(open) => {
          if (!open) setDrawerEntry(null);
        }}
      />
    </main>
  );
}
