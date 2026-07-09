"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { format } from "date-fns";

import { useHipaaToast } from "@/components/hipaa/use-hipaa-toast";
import { DisconnectDialog } from "@/components/integrations/detail/DisconnectDialog";
import { EvidenceTab } from "@/components/integrations/detail/EvidenceTab";
import { OverviewTab } from "@/components/integrations/detail/OverviewTab";
import { SettingsTab } from "@/components/integrations/detail/SettingsTab";
import { SyncHistoryTab } from "@/components/integrations/detail/SyncHistoryTab";
import { IntegrationIcon } from "@/components/integrations/IntegrationIcon";
import { Button } from "@/components/ui/button";
import type { EvidenceListItem } from "@/lib/evidence-queries";
import type { CollectionJobDto } from "@/lib/integration-detail";
import type {
  IntegrationDetailDto,
  IntegrationOverviewDto,
} from "@/lib/integration-detail-queries";
import { getCatalogEntry, getCategoryLabel } from "@/lib/integration-catalog";
import { toIconTargetFromType } from "@/lib/integration-icons";
import {
  enqueueIntegrationSync,
  formatSyncSuccessMessage,
  pollSyncJob,
} from "@/lib/integration-sync-client";
import { cn } from "@/lib/utils";

export type DetailTab = "overview" | "history" | "evidence" | "settings";

const TABS: Array<{ id: DetailTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "history", label: "Sync history" },
  { id: "evidence", label: "Evidence" },
  { id: "settings", label: "Settings" },
];

function parseTab(value: string | null): DetailTab {
  if (
    value === "overview" ||
    value === "history" ||
    value === "evidence" ||
    value === "settings"
  ) {
    return value;
  }
  return "overview";
}

type IntegrationDetailClientProps = {
  initialIntegration: IntegrationDetailDto;
  initialOverview: IntegrationOverviewDto;
  initialJobs: CollectionJobDto[];
  initialEvidence: EvidenceListItem[];
};

export function IntegrationDetailClient({
  initialIntegration,
  initialOverview,
  initialJobs,
  initialEvidence,
}: IntegrationDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, HipaaToast } = useHipaaToast();

  const [integration, setIntegration] = useState(initialIntegration);
  const [overview, setOverview] = useState(initialOverview);
  const [jobs, setJobs] = useState(initialJobs);
  const [evidence, setEvidence] = useState(initialEvidence);
  const [syncing, setSyncing] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const tab = parseTab(searchParams.get("tab"));
  const entry = useMemo(
    () => getCatalogEntry(integration.type),
    [integration.type]
  );

  const setTab = useCallback(
    (next: DetailTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "overview") {
        params.delete("tab");
      } else {
        params.set("tab", next);
      }
      const qs = params.toString();
      router.replace(
        qs
          ? `/integrations/${integration.id}?${qs}`
          : `/integrations/${integration.id}`,
        { scroll: false }
      );
    },
    [integration.id, router, searchParams]
  );

  const refreshDetail = useCallback(async () => {
    const [detailRes, overviewRes, jobsRes, evidenceRes] = await Promise.all([
      fetch(`/api/integrations/manage/${integration.id}`, { cache: "no-store" }),
      fetch(`/api/integrations/manage/${integration.id}/overview`, {
        cache: "no-store",
      }),
      fetch(`/api/integrations/manage/${integration.id}/jobs`, {
        cache: "no-store",
      }),
      fetch(
        `/api/evidence?integrationId=${encodeURIComponent(integration.id)}&limit=7`,
        { cache: "no-store" }
      ),
    ]);

    if (detailRes.ok) {
      const body = (await detailRes.json()) as { integration: IntegrationDetailDto };
      setIntegration(body.integration);
    }
    if (overviewRes.ok) {
      const body = (await overviewRes.json()) as { overview: IntegrationOverviewDto };
      setOverview(body.overview);
    }
    if (jobsRes.ok) {
      const body = (await jobsRes.json()) as { jobs: CollectionJobDto[] };
      setJobs(body.jobs);
    }
    if (evidenceRes.ok) {
      const body = (await evidenceRes.json()) as { items: EvidenceListItem[] };
      setEvidence(body.items);
    }
    router.refresh();
  }, [integration.id, router]);

  async function handleSync() {
    setSyncing(true);
    try {
      const { jobId } = await enqueueIntegrationSync(integration.id);
      const result = await pollSyncJob(jobId);
      await refreshDetail();
      if (result.ok) {
        showToast(
          "success",
          "Sync complete",
          formatSyncSuccessMessage(
            result.integration ?? integration,
            result.job.evidenceAdded
          )
        );
      } else {
        showToast("error", "Sync failed", result.message);
      }
    } catch (error) {
      showToast(
        "error",
        "Sync failed",
        error instanceof Error ? error.message : "Could not complete sync"
      );
    } finally {
      setSyncing(false);
    }
  }

  async function handleTogglePause() {
    const nextStatus = integration.status === "PAUSED" ? "ACTIVE" : "PAUSED";
    setPausing(true);
    try {
      const response = await fetch(`/api/integrations/manage/${integration.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        throw new Error("Failed to update sync status");
      }
      await refreshDetail();
      showToast(
        "success",
        nextStatus === "PAUSED" ? "Syncs paused" : "Syncs resumed",
        nextStatus === "PAUSED"
          ? `${integration.displayName} will not run scheduled or manual syncs until resumed.`
          : `${integration.displayName} is active again.`
      );
    } catch (error) {
      showToast(
        "error",
        "Update failed",
        error instanceof Error ? error.message : "Could not update status"
      );
    } finally {
      setPausing(false);
    }
  }

  async function handleDisconnect() {
    const response = await fetch(`/api/integrations/manage/${integration.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error("Failed to disconnect integration");
    }
    showToast(
      "success",
      "Disconnected",
      `${integration.displayName} credentials were purged.`
    );
    router.push("/integrations");
    router.refresh();
  }

  const categoryLabel = entry
    ? getCategoryLabel(entry.category)
    : integration.category
      ? getCategoryLabel(
          integration.category as Parameters<typeof getCategoryLabel>[0]
        )
      : "Integrations";

  const evidenceBrowserHref = `/evidence?source=${encodeURIComponent(
    entry?.iconId ?? integration.type.replace(/^demo-/, "")
  )}`;

  return (
    <main className="flex w-full flex-1 flex-col gap-5 p-8">
      <nav className="text-xs text-muted-foreground">
        <Link href="/integrations" className="hover:text-foreground">
          Integrations
        </Link>
        <span className="mx-1.5 text-muted-foreground/70">/</span>
        <span>{categoryLabel}</span>
        <span className="mx-1.5 text-muted-foreground/70">/</span>
        <span className="font-medium text-foreground">
          {integration.displayName}
        </span>
      </nav>

      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 gap-3.5">
          <IntegrationIcon
            target={toIconTargetFromType(
              integration.type,
              integration.displayName,
              entry ?? undefined
            )}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight">
                {integration.displayName}
              </h1>
              <StatusBadge status={integration.status} />
            </div>
            <p className="mt-1 max-w-2xl text-[12.5px] leading-relaxed text-muted-foreground">
              {integration.description ??
                "Collects compliance evidence on a scheduled sync."}{" "}
              Credentials are read-only and never leave our infrastructure
              decrypted.
            </p>
            <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-[11.5px] text-muted-foreground">
              <span>
                <strong className="font-medium text-foreground/80">
                  Connected
                </strong>{" "}
                {format(new Date(integration.createdAt), "MMM d, yyyy")}
              </span>
              {integration.authMethod ? (
                <span>
                  <strong className="font-medium text-foreground/80">Auth</strong>{" "}
                  {integration.authMethod}
                </span>
              ) : null}
              {integration.safeConfig.slice(0, 2).map((entry) => (
                <span key={entry.key}>
                  <strong className="font-medium text-foreground/80">
                    {entry.label}
                  </strong>{" "}
                  {entry.value}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={syncing || integration.status !== "ACTIVE"}
            onClick={() => void handleSync()}
          >
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
          {integration.reconnectHref ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={integration.reconnectHref}>Edit</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex gap-0.5 border-b">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "-mb-px border-b-2 px-3.5 py-2 text-[13px] transition-colors",
              tab === item.id
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? <OverviewTab overview={overview} /> : null}
      {tab === "history" ? <SyncHistoryTab jobs={jobs} /> : null}
      {tab === "evidence" ? (
        <EvidenceTab
          items={evidence}
          totalCount={overview.evidenceCount}
          evidenceBrowserHref={evidenceBrowserHref}
        />
      ) : null}
      {tab === "settings" ? (
        <SettingsTab
          integration={integration}
          paused={integration.status === "PAUSED"}
          pausing={pausing}
          onTogglePause={() => void handleTogglePause()}
          onDisconnect={() => setDisconnectOpen(true)}
        />
      ) : null}

      <DisconnectDialog
        open={disconnectOpen}
        onOpenChange={setDisconnectOpen}
        integrationName={integration.displayName}
        evidenceCount={overview.evidenceCount}
        controls={integration.controls}
        onConfirm={handleDisconnect}
      />
      <HipaaToast />
    </main>
  );
}

function StatusBadge({ status }: { status: IntegrationDetailDto["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full px-2 text-[10.5px] font-medium",
        status === "ACTIVE" &&
          "bg-emerald-500/12 text-emerald-800 dark:text-emerald-400",
        status === "PAUSED" &&
          "bg-amber-500/12 text-amber-800 dark:text-amber-400",
        status === "ERROR" && "bg-red-500/10 text-red-700 dark:text-red-400",
        status === "DISCONNECTED" && "bg-muted text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "ACTIVE" && "bg-emerald-600 dark:bg-emerald-400",
          status === "PAUSED" && "bg-amber-600 dark:bg-amber-400",
          status === "ERROR" && "bg-red-600 dark:bg-red-400",
          status === "DISCONNECTED" && "bg-muted-foreground"
        )}
        aria-hidden
      />
      {status === "ACTIVE"
        ? "Active"
        : status === "PAUSED"
          ? "Paused"
          : status === "ERROR"
            ? "Error"
            : "Disconnected"}
    </span>
  );
}
