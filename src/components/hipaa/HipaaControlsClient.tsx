"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  FileUp,
  Loader2,
  Search,
} from "lucide-react";

import {
  ControlOwnerSelect,
  type ControlOwnerMember,
} from "@/components/hipaa/ControlOwnerSelect";
import { useHipaaToast } from "@/components/hipaa/use-hipaa-toast";
import { HelpTip } from "@/components/shared/HelpTip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SAFEGUARD_BUCKETS,
  bucketForCategory,
  type SafeguardBucket,
} from "@/lib/dashboard-safeguards";
import { canManageHipaaControls } from "@/lib/hipaa-policy-access";
import { withoutDashPunctuation } from "@/lib/help-copy";
import { cn } from "@/lib/utils";

type FrameworkControlRow = {
  id: string;
  controlRef: string;
  category: string;
  title: string;
  description: string;
  guidance: string;
  evidenceHints: string;
  isRequired: boolean;
};

type OrgControlRow = {
  id: string;
  ownerId: string | null;
  score: number;
  status: string;
  validEvidenceCount?: number;
};

type FrameworkPayload = {
  controls: Array<{
    control: FrameworkControlRow;
    orgControl: OrgControlRow;
  }>;
};

type MembersPayload = {
  members: ControlOwnerMember[];
  currentUserRole: string;
};

type ControlRow = {
  orgControlId: string;
  controlRef: string;
  title: string;
  category: string;
  safeguard: SafeguardBucket;
  score: number;
  ownerId: string | null;
  status: string;
  description: string;
  guidance: string;
  evidenceHints: string;
  isRequired: boolean;
  validEvidenceCount: number;
};

const ALL_BUCKETS = "ALL";

function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function splitHints(hints: string): string[] {
  return withoutDashPunctuation(hints)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function scoreChecklist(row: ControlRow): Array<{
  label: string;
  done: boolean;
}> {
  return [
    {
      label: "Evidence on file",
      done: row.validEvidenceCount > 0,
    },
    {
      label: "Owner assigned",
      done: Boolean(row.ownerId),
    },
    {
      label: `Status: ${formatStatus(row.status)}`,
      done: row.status !== "NOT_STARTED",
    },
  ];
}

export function HipaaControlsClient(): React.JSX.Element {
  const { showToast, HipaaToast } = useHipaaToast();
  const [rows, setRows] = useState<ControlRow[]>([]);
  const [members, setMembers] = useState<ControlOwnerMember[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState<SafeguardBucket | typeof ALL_BUCKETS>(
    ALL_BUCKETS
  );
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [frameworkRes, membersRes] = await Promise.all([
        fetch("/api/hipaa/framework", { cache: "no-store" }),
        fetch("/api/settings/members", { cache: "no-store" }),
      ]);
      if (!frameworkRes.ok) {
        throw new Error("Failed to load HIPAA controls.");
      }
      if (!membersRes.ok) {
        throw new Error("Failed to load organization members.");
      }

      const framework = (await frameworkRes.json()) as FrameworkPayload;
      const membersBody = (await membersRes.json()) as MembersPayload;

      setMembers(
        (membersBody.members ?? []).filter((m) => Boolean(m.clerkUserId))
      );
      setCanManage(canManageHipaaControls(membersBody.currentUserRole ?? ""));

      setRows(
        (framework.controls ?? []).map(({ control, orgControl }) => ({
          orgControlId: orgControl.id,
          controlRef: control.controlRef,
          title: control.title,
          category: control.category,
          safeguard: bucketForCategory(control.category),
          score: orgControl.score,
          ownerId: orgControl.ownerId,
          status: orgControl.status,
          description: control.description,
          guidance: control.guidance,
          evidenceHints: control.evidenceHints,
          isRequired: control.isRequired,
          validEvidenceCount: orgControl.validEvidenceCount ?? 0,
        }))
      );
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (bucket !== ALL_BUCKETS && row.safeguard !== bucket) return false;
      if (unassignedOnly && row.ownerId) return false;
      if (!q) return true;
      return (
        row.controlRef.toLowerCase().includes(q) ||
        row.title.toLowerCase().includes(q) ||
        row.description.toLowerCase().includes(q)
      );
    });
  }, [rows, search, bucket, unassignedOnly]);

  const unassignedCount = useMemo(
    () => rows.filter((r) => !r.ownerId).length,
    [rows]
  );

  async function assignOwner(
    orgControlId: string,
    ownerId: string | null
  ): Promise<void> {
    const previous = rows.find((r) => r.orgControlId === orgControlId);
    if (!previous) return;
    if (previous.ownerId === ownerId) return;

    setSavingId(orgControlId);
    setRows((current) =>
      current.map((row) =>
        row.orgControlId === orgControlId ? { ...row, ownerId } : row
      )
    );

    try {
      const res = await fetch(`/api/hipaa/controls/${orgControlId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Could not update owner.");
      }
      const body = (await res.json()) as {
        id: string;
        ownerId: string | null;
        score: number;
      };
      setRows((current) =>
        current.map((row) =>
          row.orgControlId === orgControlId
            ? { ...row, ownerId: body.ownerId, score: body.score }
            : row
        )
      );
      showToast(
        "success",
        ownerId ? "Owner assigned" : "Owner cleared",
        ownerId
          ? "Readiness will reflect the owner on this control."
          : "This control no longer has an assigned owner."
      );
    } catch (err) {
      setRows((current) =>
        current.map((row) =>
          row.orgControlId === orgControlId
            ? { ...row, ownerId: previous.ownerId }
            : row
        )
      );
      showToast(
        "error",
        "Update failed",
        err instanceof Error ? err.message : "Could not update owner."
      );
    } finally {
      setSavingId(null);
    }
  }

  function toggleExpanded(orgControlId: string): void {
    setExpandedId((current) =>
      current === orgControlId ? null : orgControlId
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          HIPAA controls
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Assign owners and expand any control for a quick briefing: what it
          requires, how to implement it, and what evidence auditors expect.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by citation or title"
            className="pl-9"
            aria-label="Search controls"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="safeguard-filter" className="text-xs">
            Safeguard
          </Label>
          <Select
            value={bucket}
            onValueChange={(v) =>
              setBucket(v as SafeguardBucket | typeof ALL_BUCKETS)
            }
          >
            <SelectTrigger id="safeguard-filter" className="w-[11rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_BUCKETS}>All</SelectItem>
              {SAFEGUARD_BUCKETS.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            className="size-4 rounded border-border"
            checked={unassignedOnly}
            onChange={(e) => setUnassignedOnly(e.target.checked)}
          />
          Unassigned only
          <span className="tabular-nums text-foreground">
            ({unassignedCount})
          </span>
        </label>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading controls…
        </div>
      ) : null}

      {loadError ? (
        <p className="text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : null}

      {!loading && !loadError ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="w-10 px-2 py-2.5">
                  <span className="sr-only">Expand</span>
                </th>
                <th className="px-3 py-2.5 font-medium">Citation</th>
                <th className="px-3 py-2.5 font-medium">Title</th>
                <th className="px-3 py-2.5 font-medium">Safeguard</th>
                <th className="px-3 py-2.5 font-medium tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    Score
                    <HelpTip content="Per control readiness from 0 to 100. Evidence, freshness, approved policies, and ownership all contribute." />
                  </span>
                </th>
                <th className="px-3 py-2.5 font-medium">Owner</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No controls match these filters.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const expanded = expandedId === row.orgControlId;
                  const hints = splitHints(row.evidenceHints);
                  const checklist = scoreChecklist(row);
                  return (
                    <Fragment key={row.orgControlId}>
                      <tr
                        className={cn(
                          "border-b border-border",
                          expanded && "border-b-0 bg-muted/20"
                        )}
                      >
                        <td className="px-2 py-2.5">
                          <button
                            type="button"
                            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-expanded={expanded}
                            aria-controls={`control-summary-${row.orgControlId}`}
                            aria-label={
                              expanded
                                ? `Collapse ${row.controlRef}`
                                : `Expand ${row.controlRef} summary`
                            }
                            onClick={() => toggleExpanded(row.orgControlId)}
                          >
                            <ChevronDown
                              className={cn(
                                "size-4 transition-transform",
                                expanded && "rotate-180"
                              )}
                              aria-hidden
                            />
                          </button>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs whitespace-nowrap">
                          <button
                            type="button"
                            className="text-left hover:underline"
                            onClick={() => toggleExpanded(row.orgControlId)}
                          >
                            {row.controlRef}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 max-w-[18rem]">
                          <button
                            type="button"
                            className="line-clamp-2 text-left hover:underline"
                            onClick={() => toggleExpanded(row.orgControlId)}
                          >
                            {row.title}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {row.safeguard}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {Math.round(row.score)}
                        </td>
                        <td className="px-3 py-2.5 min-w-[12rem]">
                          <div className="flex items-center gap-2">
                            <ControlOwnerSelect
                              value={row.ownerId}
                              members={members}
                              canManage={canManage}
                              disabled={savingId === row.orgControlId}
                              onChange={(ownerId) => {
                                void assignOwner(row.orgControlId, ownerId);
                              }}
                              className={cn(
                                "h-8 w-full max-w-[14rem]",
                                savingId === row.orgControlId && "opacity-70"
                              )}
                            />
                            {savingId === row.orgControlId ? (
                              <Loader2
                                className="size-3.5 shrink-0 animate-spin text-muted-foreground"
                                aria-hidden
                              />
                            ) : null}
                          </div>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr className="border-b border-border bg-muted/15">
                          <td colSpan={6} className="px-4 py-4 sm:px-6">
                            <div
                              id={`control-summary-${row.orgControlId}`}
                              className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
                            >
                              <div className="space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline">
                                    {row.isRequired
                                      ? "Required"
                                      : "Addressable"}
                                  </Badge>
                                  <Badge variant="outline">
                                    {formatStatus(row.status)}
                                  </Badge>
                                  <Badge variant="outline">
                                    {row.validEvidenceCount} evidence file
                                    {row.validEvidenceCount === 1 ? "" : "s"}
                                  </Badge>
                                </div>

                                <section className="space-y-1.5">
                                  <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    What this requires
                                  </h2>
                                  <p className="text-sm leading-relaxed text-foreground">
                                    {withoutDashPunctuation(row.description)}
                                  </p>
                                </section>

                                <section className="space-y-1.5">
                                  <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    How to implement it
                                  </h2>
                                  <p className="text-sm leading-relaxed text-muted-foreground">
                                    {withoutDashPunctuation(row.guidance)}
                                  </p>
                                </section>
                              </div>

                              <div className="space-y-4 rounded-lg border border-border bg-card p-4">
                                <section className="space-y-2">
                                  <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    Your checklist
                                  </h2>
                                  <ul className="space-y-1.5 text-sm">
                                    {checklist.map((item) => (
                                      <li
                                        key={item.label}
                                        className="flex items-start gap-2"
                                      >
                                        <span
                                          className={cn(
                                            "mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border text-[10px]",
                                            item.done
                                              ? "border-brand bg-brand/15 text-brand"
                                              : "border-border text-muted-foreground"
                                          )}
                                          aria-hidden
                                        >
                                          {item.done ? "✓" : ""}
                                        </span>
                                        <span
                                          className={
                                            item.done
                                              ? "text-foreground"
                                              : "text-muted-foreground"
                                          }
                                        >
                                          {item.label}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </section>

                                {hints.length > 0 ? (
                                  <section className="space-y-2">
                                    <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                      Evidence auditors look for
                                    </h2>
                                    <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
                                      {hints.map((hint) => (
                                        <li key={hint}>{hint}</li>
                                      ))}
                                    </ul>
                                  </section>
                                ) : null}

                                <div className="flex flex-wrap gap-2 pt-1">
                                  <Button size="sm" asChild>
                                    <Link href="/evidence/upload">
                                      <FileUp
                                        className="mr-1.5 size-3.5"
                                        aria-hidden
                                      />
                                      Upload evidence
                                    </Link>
                                  </Button>
                                  <Button size="sm" variant="outline" asChild>
                                    <Link href="/evidence">
                                      <ExternalLink
                                        className="mr-1.5 size-3.5"
                                        aria-hidden
                                      />
                                      Browse evidence
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      <HipaaToast />
    </div>
  );
}
