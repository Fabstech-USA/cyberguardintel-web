"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PolicyStatus, PolicyType } from "@/generated/prisma";
import { PolicyGenerationProgress } from "@/components/hipaa/PolicyGenerationProgress";
import { regeneratePoliciesViaStream } from "@/lib/regenerate-policy-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  HIPAA_POLICY_TARGET,
  HIPAA_POLICY_TYPE_ORDER,
  countMissingPolicies,
  getPolicyDisplayTitle,
  type MergedPolicyRow,
  type PolicyStatusSummary,
  type PolicyUiStatus,
} from "@/lib/hipaa-policy-catalog";
import type { SafeguardBucket } from "@/lib/dashboard-safeguards";
import { SAFEGUARD_BUCKETS } from "@/lib/dashboard-safeguards";
import { cn } from "@/lib/utils";

type PoliciesApiResponse = {
  allRows: MergedPolicyRow[];
  summary: PolicyStatusSummary;
  canManagePolicies: boolean;
};

const STATUS_TABS: { id: PolicyUiStatus | "ALL"; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: PolicyStatus.APPROVED, label: "Approved" },
  { id: PolicyStatus.UNDER_REVIEW, label: "Under review" },
  { id: PolicyStatus.DRAFT, label: "Draft" },
  { id: "NOT_STARTED", label: "Not started" },
];

const SAFEGUARD_TABS: { id: SafeguardBucket | "ALL"; label: string }[] = [
  { id: "ALL", label: "All safeguards" },
  ...SAFEGUARD_BUCKETS.map((b) => ({ id: b, label: b })),
];

function StatusBadge({ row }: { row: MergedPolicyRow }) {
  const s = row.status;
  if (s === "NOT_STARTED") {
    return (
      <span className="text-muted-foreground text-xs font-medium">
        Not started
      </span>
    );
  }
  if (s === PolicyStatus.APPROVED) {
    return (
      <Badge className="border-emerald-600/30 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300">
        Approved
      </Badge>
    );
  }
  if (s === PolicyStatus.UNDER_REVIEW) {
    return (
      <Badge className="border-sky-600/30 bg-sky-50 text-sky-800 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-300">
        Under review
      </Badge>
    );
  }
  if (s === PolicyStatus.DRAFT) {
    return (
      <Badge className="border-amber-600/30 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200">
        Draft
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-border bg-muted/60 text-foreground/70 dark:text-muted-foreground"
    >
      Archived
    </Badge>
  );
}

export function PolicyLibraryClient() {
  const [data, setData] = useState<PoliciesApiResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<PolicyUiStatus | "ALL">("ALL");
  const [safeguardTab, setSafeguardTab] = useState<SafeguardBucket | "ALL">(
    "ALL"
  );
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchDone, setBatchDone] = useState(0);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchLabel, setBatchLabel] = useState<string | null>(null);
  const [generatingType, setGeneratingType] = useState<PolicyType | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/hipaa/policies", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to load policies (${res.status})`);
      }
      const json = (await res.json()) as PoliciesApiResponse;
      setData(json);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    return data.allRows.filter((r) => {
      if (statusTab !== "ALL" && r.status !== statusTab) return false;
      if (safeguardTab !== "ALL" && r.safeguard !== safeguardTab)
        return false;
      return true;
    });
  }, [data, statusTab, safeguardTab]);

  const missingCount = data ? countMissingPolicies(data.allRows) : 0;
  const approvedPct = data
    ? Math.round((data.summary.approved / HIPAA_POLICY_TARGET) * 100)
    : 0;

  const allNotStarted =
    data?.summary.notStarted === HIPAA_POLICY_TARGET &&
    data.summary.approved === 0 &&
    data.summary.draft === 0 &&
    data.summary.underReview === 0;

  const missingPolicyTypes = useMemo(() => {
    if (!data) return [] as PolicyType[];
    return data.allRows
      .filter((r) => r.status === "NOT_STARTED")
      .map((r) => r.type);
  }, [data]);

  const generateBatchLabel =
    missingCount === HIPAA_POLICY_TARGET
      ? "Generate all"
      : `Generate missing (${missingCount})`;

  const generateBatchProgressLabel =
    missingCount === HIPAA_POLICY_TARGET
      ? "Generating all policies"
      : "Generating missing policies";

  const runNdjsonStream = async (
    policyTypes: PolicyType[],
    label: string
  ) => {
    if (policyTypes.length === 0) return;
    setBatchRunning(true);
    setBatchDone(0);
    setBatchTotal(policyTypes.length);
    setBatchLabel(label);
    setGeneratingType(policyTypes[0] ?? null);
    let completed = 0;
    try {
      await regeneratePoliciesViaStream(policyTypes, {
        onStarted: (policyType) => setGeneratingType(policyType),
        onCompleted: () => {
          completed += 1;
          setBatchDone(completed);
          setGeneratingType(null);
        },
        onFailed: (policyType, error) => {
          completed += 1;
          setBatchDone(completed);
          setGeneratingType(null);
          setLoadError(`${getPolicyDisplayTitle(policyType)}: ${error}`);
        },
      });
      await load();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBatchRunning(false);
      setBatchLabel(null);
      setBatchTotal(0);
      setBatchDone(0);
      setGeneratingType(null);
    }
  };

  const currentGeneratingTitle = generatingType
    ? getPolicyDisplayTitle(generatingType)
    : null;

  const summary = data?.summary;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Policy library
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            All {HIPAA_POLICY_TARGET} HIPAA-required policies. AI-drafted
            against reviewed templates — approve each before it goes live.
          </p>
        </div>
        {data?.canManagePolicies && missingCount > 0 && !allNotStarted ? (
          <Button
            type="button"
            className="shrink-0 bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={batchRunning}
            onClick={() =>
              void runNdjsonStream(
                missingPolicyTypes,
                generateBatchProgressLabel
              )
            }
          >
            {batchRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Generating…
              </>
            ) : (
              generateBatchLabel
            )}
          </Button>
        ) : null}
      </div>

      {batchRunning && batchLabel ? (
        <PolicyGenerationProgress
          label={batchLabel}
          currentPolicyTitle={currentGeneratingTitle}
          completed={batchDone}
          total={batchTotal}
        />
      ) : null}

      {loadError ? (
        <p className="text-destructive text-sm">{loadError}</p>
      ) : null}

      {summary ? (
        <div className="bg-card space-y-3 rounded-xl border border-border p-4">
          <div className="flex items-start justify-between gap-4">
            <p className="text-muted-foreground min-w-0 text-sm">
              <span className="text-foreground font-medium">
                {summary.approved} of {HIPAA_POLICY_TARGET} policies approved
              </span>
              {" · "}
              {summary.underReview} under review · {summary.draft} drafts ·{" "}
              {summary.notStarted} not started
              {summary.renewalDue > 0 ? (
                <>
                  {" · "}
                  <span className="text-amber-400">
                    {summary.renewalDue} renewal overdue
                  </span>
                </>
              ) : null}
            </p>
            <span className="text-foreground shrink-0 text-2xl font-semibold tabular-nums">
              {approvedPct}%
            </span>
          </div>
          <Progress
            value={approvedPct}
            className="h-1.5"
            indicatorClassName="bg-emerald-600 dark:bg-emerald-500"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusTab(tab.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                statusTab === tab.id
                  ? "border-border bg-foreground text-background"
                  : "border-border text-muted-foreground hover:bg-muted/60"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {SAFEGUARD_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSafeguardTab(tab.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                safeguardTab === tab.id
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/60"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {allNotStarted && data?.canManagePolicies ? (
        <div className="border-primary/30 bg-primary/5 rounded-xl border border-dashed p-8 text-center">
          <p className="text-foreground mb-1 font-medium">
            No policies yet — generate all {HIPAA_POLICY_TARGET} drafts
          </p>
          <p className="text-muted-foreground mx-auto mb-4 max-w-md text-sm">
            We&apos;ll queue AI drafts against your org profile. Review each
            policy before approval.
          </p>
          <Button
            type="button"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={batchRunning}
            onClick={() =>
              void runNdjsonStream(
                [...HIPAA_POLICY_TYPE_ORDER],
                "Generating all policies"
              )
            }
          >
            {batchRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Generating…
              </>
            ) : (
              "Generate all"
            )}
          </Button>
        </div>
      ) : null}

      <div className="border-border relative overflow-hidden rounded-xl border">
        {batchRunning ? (
          <div
            className="pointer-events-none absolute inset-0 z-10 bg-background/40 backdrop-blur-[1px]"
            aria-hidden
          />
        ) : null}
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 border-border border-b">
            <tr>
              <th className="px-4 py-3 font-medium">Policy</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">
                Safeguard
              </th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">
                Last updated
              </th>
              <th className="px-4 py-3 font-medium">Version</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {!data ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-muted-foreground px-4 py-8 text-center"
                >
                  Loading…
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-muted-foreground px-4 py-8 text-center"
                >
                  No policies match these filters.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const isGenerating =
                  batchRunning && generatingType === row.type;

                return (
                <tr
                  key={row.type}
                  className={cn(
                    "border-border border-b last:border-b-0 transition-colors",
                    isGenerating
                      ? "bg-emerald-500/10 motion-safe:animate-pulse"
                      : "hover:bg-muted/20"
                  )}
                >
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{row.displayTitle}</span>
                      <span className="text-muted-foreground text-xs">
                        {row.cfr}
                      </span>
                      {row.renewalDue ? (
                        <span className="text-amber-400 text-xs">
                          Renewal overdue
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {isGenerating ? (
                      <div className="flex items-center gap-2">
                        <Loader2
                          className="h-3.5 w-3.5 shrink-0 animate-spin text-emerald-500"
                          aria-hidden
                        />
                        <span className="text-emerald-600 text-xs font-medium dark:text-emerald-400">
                          Generating…
                        </span>
                      </div>
                    ) : (
                      <StatusBadge row={row} />
                    )}
                  </td>
                  <td className="text-muted-foreground hidden px-4 py-3 align-top sm:table-cell">
                    {row.safeguard}
                  </td>
                  <td className="text-muted-foreground hidden px-4 py-3 align-top md:table-cell">
                    {row.updatedAt
                      ? format(new Date(row.updatedAt), "MMM d, yyyy")
                      : "—"}
                  </td>
                  <td className="text-muted-foreground px-4 py-3 align-top">
                    {row.versionLabel ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    {row.id ? (
                      <Link
                        href={`/hipaa/policies/${row.id}`}
                        className="text-emerald-500 hover:text-emerald-400 text-xs font-medium"
                      >
                        Open →
                      </Link>
                    ) : data.canManagePolicies ? (
                      <button
                        type="button"
                        disabled={batchRunning}
                        className="text-emerald-500 hover:text-emerald-400 inline-flex cursor-pointer items-center justify-end gap-1 text-xs font-medium disabled:opacity-50"
                        onClick={() =>
                          void runNdjsonStream(
                            [row.type],
                            `Generating ${row.displayTitle}`
                          )
                        }
                      >
                        {isGenerating ? (
                          <>
                            <Loader2
                              className="h-3 w-3 animate-spin"
                              aria-hidden
                            />
                            Generating…
                          </>
                        ) : (
                          "Generate →"
                        )}
                      </button>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
