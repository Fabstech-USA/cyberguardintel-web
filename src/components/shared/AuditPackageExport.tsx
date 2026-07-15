"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, subMonths } from "date-fns";
import {
  AlertTriangle,
  CalendarIcon,
  Check,
  CheckCircle2,
  Circle,
  Download,
  Loader2,
  XCircle,
} from "lucide-react";
import type { DateRange } from "react-day-picker";

import { HelpTip } from "@/components/shared/HelpTip";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AUDIT_PACKAGE_SECTION_IDS,
  AUDIT_PACKAGE_SECTION_LABELS,
  type AuditPackageSectionId,
  type AuditProgressStep,
} from "@/lib/audit-package-sections";
import { cn } from "@/lib/utils";

type Phase = "config" | "progress" | "done";

type ReadinessState = "ok" | "partial" | "danger";

type ReadinessSection = {
  id: AuditPackageSectionId;
  label: string;
  state: ReadinessState;
  count: string;
  reason: string;
  systemCount?: number;
  edgeCount?: number;
};

function formatSystemsCount(n: number): string {
  return `${n} system${n === 1 ? "" : "s"}`;
}

/** Prefer API `count`; derive a mockup-style short label from `reason` if missing. */
function resolveShortCount(section?: ReadinessSection): string {
  if (!section) return "—";

  // PHI flow map: always prefer the numeric system count when present.
  if (section.id === "phi_map" && typeof section.systemCount === "number") {
    return formatSystemsCount(section.systemCount);
  }

  const raw = typeof section.count === "string" ? section.count.trim() : "";
  if (raw) return raw;

  const reason = section.reason ?? "";
  switch (section.id) {
    case "evidence": {
      const of = reason.match(/(\d+)\s+of\s+(\d+)/i);
      if (of) return `${of[1]} of ${of[2]} files`;
      const n = reason.match(/(\d+)/);
      return n ? `${n[1]} files` : reason || "—";
    }
    case "policies": {
      const of = reason.match(/(\d+)\s+of\s+(\d+)/i);
      if (of) return `${of[1]} of ${of[2]}`;
      const n = reason.match(/(\d+)\s+approved/i);
      return n ? `${n[1]} approved` : reason || "—";
    }
    case "risk_assessment": {
      const v = reason.match(/\bv(\d+)\b/i);
      if (v) return `v${v[1]}`;
      if (/not approved|no approved/i.test(reason)) return "Not approved";
      if (/approved/i.test(reason)) return "Approved";
      return reason || "—";
    }
    case "baa": {
      const n = reason.match(/(\d+)\s+signed/i);
      if (n) return `${n[1]} signed`;
      if (/no baa/i.test(reason)) return "0 records";
      return reason || "—";
    }
    case "training": {
      const n = reason.match(/(\d+)\s+record/i);
      return n ? `${n[1]} records` : reason || "—";
    }
    case "phi_map": {
      const n = reason.match(/(\d+)\s+system/i);
      if (n) return formatSystemsCount(Number(n[1]));
      if (/no phi systems/i.test(reason)) return formatSystemsCount(0);
      return reason || formatSystemsCount(0);
    }
    case "audit_log": {
      const n =
        reason.match(/([\d,]+)\s+audit log/i) || reason.match(/([\d,]+)/);
      return n ? `${n[1]} entries` : reason || "—";
    }
    case "readme":
      return "Auto-generated";
    default:
      return reason || "—";
  }
}


type ExportJobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";

type ExportJobResponse = {
  jobId: string;
  status: ExportJobStatus;
  steps?: AuditProgressStep[];
  currentStep?: string | null;
  progressPercent?: number;
  signedUrl?: string;
  errorMessage?: string | null;
};

const POLL_INTERVAL_MS = 1000;

const PACKAGE_INCLUDES = [
  "Cover README with org profile and scope",
  "Evidence files organized by safeguard",
  "All approved policy PDFs",
  "Risk assessment report",
  "BAA inventory with status log",
  "Training records and attestations",
  "PHI flow map (systems and data flows)",
  "Timestamped audit trail CSV",
];

const SIDEBAR_METRIC_IDS: AuditPackageSectionId[] = [
  "evidence",
  "policies",
  "risk_assessment",
  "baa",
  "training",
];

function defaultRange(): DateRange {
  return {
    from: subMonths(new Date(), 12),
    to: new Date(),
  };
}

function badgeClass(state: ReadinessState): string {
  if (state === "ok") {
    return "border-transparent bg-emerald-100 text-emerald-800";
  }
  if (state === "partial") {
    return "border-transparent bg-amber-100 text-amber-900";
  }
  return "border-transparent bg-red-100 text-red-800";
}

function badgeLabel(state: ReadinessState): string {
  if (state === "ok") return "Ready";
  if (state === "partial") return "Partial";
  return "Needs work";
}

function recommendationForSection(section: ReadinessSection): string {
  switch (section.id) {
    case "evidence":
      return section.state === "danger"
        ? "collect evidence for the selected date range"
        : "attach downloadable files to evidence items that are missing S3 objects";
    case "policies":
      return section.state === "danger"
        ? "approve at least one policy PDF"
        : "finish and approve remaining policies (or attach approved PDFs)";
    case "risk_assessment":
      return "approve the risk assessment";
    case "baa":
      return section.state === "danger"
        ? "add and sign BAAs for vendors that handle PHI"
        : "resolve pending or expired BAAs";
    case "training":
      return section.state === "danger"
        ? "record workforce HIPAA training"
        : "complete overdue training records";
    case "phi_map":
      return section.state === "danger"
        ? "map PHI systems in the PHI flow map"
        : "add data-flow edges between PHI systems";
    case "audit_log":
      return "ensure activity has been logged in the selected date range";
    case "readme":
      return "regenerate the cover README";
    default:
      return `complete ${section.label.toLowerCase()}`;
  }
}

function formatRecommendationList(phrases: string[]): string {
  if (phrases.length === 0) return "";
  if (phrases.length === 1) return phrases[0];
  if (phrases.length === 2) return `${phrases[0]} and ${phrases[1]}`;
  return `${phrases.slice(0, -1).join(", ")}, and ${phrases[phrases.length - 1]}`;
}

function buildReadinessRecommendation(sections: ReadinessSection[]): string {
  const phrases = sections.map(recommendationForSection);
  return `We recommend ${formatRecommendationList(phrases)} before generating.`;
}

function meterColor(pct: number): string {
  if (pct >= 80) return "bg-[#63991F]";
  if (pct >= 50) return "bg-[#EF9F27]";
  return "bg-[#E24B4A]";
}

function metricColor(state: ReadinessState): string {
  if (state === "ok") return "text-[#3B6D11]";
  if (state === "partial") return "text-[#854F0B]";
  return "text-[#A32D2D]";
}

function StepIcon({ status }: { status: AuditProgressStep["status"] }) {
  if (status === "done") {
    return <CheckCircle2 className="size-4 text-emerald-700" />;
  }
  if (status === "running") {
    return <Loader2 className="size-4 animate-spin text-emerald-800" />;
  }
  if (status === "error") {
    return <XCircle className="size-4 text-destructive" />;
  }
  return <Circle className="size-4 text-muted-foreground" />;
}

export function AuditPackageWizard() {
  const [phase, setPhase] = useState<Phase>("config");
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [selectedSections, setSelectedSections] = useState<Set<AuditPackageSectionId>>(
    () => new Set(AUDIT_PACKAGE_SECTION_IDS)
  );
  const [readiness, setReadiness] = useState<ReadinessSection[]>([]);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<ExportJobStatus | null>(null);
  const [steps, setSteps] = useState<AuditProgressStep[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);

  const [emailOpen, setEmailOpen] = useState(false);
  const [auditorEmail, setAuditorEmail] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const fromIso = range.from ? format(range.from, "yyyy-MM-dd") : "";
  const toIso = range.to ? format(range.to, "yyyy-MM-dd") : "";

  const selectedList = useMemo(
    () => AUDIT_PACKAGE_SECTION_IDS.filter((id) => selectedSections.has(id)),
    [selectedSections]
  );

  const partialSelected = useMemo(
    () =>
      readiness.filter(
        (s) =>
          selectedSections.has(s.id) &&
          (s.state === "partial" || s.state === "danger") &&
          s.id !== "readme"
      ),
    [readiness, selectedSections]
  );

  const percentReady = useMemo(() => {
    const selectable = selectedList.filter((id) => id !== "readme");
    if (selectable.length === 0) return 100;
    const readyCount = selectable.filter((id) => {
      const section = readiness.find((s) => s.id === id);
      return section?.state === "ok";
    }).length;
    return Math.round((readyCount / selectable.length) * 100);
  }, [selectedList, readiness]);

  const loadReadiness = useCallback(async () => {
    if (!fromIso || !toIso) return;
    setReadinessLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/audit/export/readiness?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
        { cache: "no-store" }
      );
      const data = (await res.json()) as {
        sections?: ReadinessSection[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load readiness");
      setReadiness(
        (data.sections ?? []).map((section) => ({
          ...section,
          count: resolveShortCount(section),
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load readiness");
    } finally {
      setReadinessLoading(false);
    }
  }, [fromIso, toIso]);

  useEffect(() => {
    void loadReadiness();
  }, [loadReadiness]);

  useEffect(() => {
    if (phase !== "progress" || !jobId || !status) return;
    if (status === "COMPLETED" || status === "FAILED") return;

    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(
          `/api/audit/export?jobId=${encodeURIComponent(jobId)}`
        );
        const data = (await res.json()) as ExportJobResponse & { error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Failed to check export status");
          setPhase("config");
          return;
        }
        setStatus(data.status);
        setSteps(data.steps ?? []);
        setProgressPercent(data.progressPercent ?? 0);
        if (data.status === "COMPLETED" && data.signedUrl) {
          setSignedUrl(data.signedUrl);
          setCompletedAt(new Date());
          setPhase("done");
        } else if (data.status === "FAILED") {
          setError(data.errorMessage ?? "Export failed");
          setPhase("config");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Polling failed");
          setPhase("config");
        }
      }
    };

    const id = window.setInterval(() => {
      void tick();
    }, POLL_INTERVAL_MS);
    void tick();

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [phase, jobId, status]);

  function toggleSection(id: AuditPackageSectionId, checked: boolean) {
    if (id === "readme") return;
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      next.add("readme");
      return next;
    });
  }

  async function startExport() {
    if (!fromIso || !toIso) {
      setError("Select a date range");
      return;
    }
    setError(null);
    setEmailSent(false);
    setSignedUrl(null);
    setSteps([]);
    setProgressPercent(0);
    setCompletedAt(null);

    try {
      const res = await fetch("/api/audit/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: fromIso,
          to: toIso,
          sections: [...selectedSections],
        }),
      });
      const data = (await res.json()) as {
        jobId?: string;
        status?: ExportJobStatus;
        error?: string;
      };
      if (!res.ok || !data.jobId) {
        throw new Error(data.error ?? "Failed to start export");
      }
      setJobId(data.jobId);
      setStatus(data.status ?? "QUEUED");
      setPhase("progress");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start export");
    }
  }

  async function sendToAuditor() {
    if (!jobId || !auditorEmail.trim()) return;
    setEmailSending(true);
    setError(null);
    try {
      const res = await fetch("/api/audit/export/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, to: auditorEmail.trim() }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) throw new Error(data.error ?? "Failed to send email");
      setEmailSent(true);
      setEmailOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setEmailSending(false);
    }
  }

  function resetToConfig() {
    setPhase("config");
    setJobId(null);
    setStatus(null);
    setSteps([]);
    setSignedUrl(null);
    setProgressPercent(0);
    setEmailSent(false);
    setCompletedAt(null);
    void loadReadiness();
  }

  const zipName = `HIPAA_Audit_Package_${toIso || format(new Date(), "yyyy-MM-dd")}.zip`;
  const packageSummary = readiness
    .filter((s) => selectedSections.has(s.id) && s.id !== "readme")
    .map((s) => s.reason)
    .join(" · ");

  return (
    <div className="w-full max-w-[900px]">
      {phase === "config" && (
        <div className="flex flex-col gap-4">
          {partialSelected.length > 0 ? (
            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-950">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-700" />
              <div>
                <strong>
                  {partialSelected.length} item
                  {partialSelected.length > 1 ? "s" : ""} partially complete.
                </strong>{" "}
                You can still export, but an auditor will flag incomplete
                sections. {buildReadinessRecommendation(partialSelected)}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="rounded-xl border bg-background p-4 shadow-xs">
              <p className="mb-1 inline-flex items-center gap-1.5 text-[13px] font-medium">
                Include in package
                <HelpTip content="Check what to bundle for an auditor. The date range below limits which evidence files are included in the ZIP." />
              </p>
              <ul className="m-0 list-none p-0">
                {AUDIT_PACKAGE_SECTION_IDS.map((id) => {
                  const section = readiness.find((s) => s.id === id);
                  const checked = selectedSections.has(id);
                  const locked = id === "readme";
                  const state = section?.state ?? "partial";
                  const shortCount = readinessLoading
                    ? "…"
                    : section?.count?.trim() ||
                      (id === "phi_map" && typeof section?.systemCount === "number"
                        ? formatSystemsCount(section.systemCount)
                        : resolveShortCount(section));
                  return (
                    <li
                      key={id}
                      className="flex cursor-pointer items-center gap-2.5 border-b border-border/60 py-2.5 text-[12.5px] last:border-b-0"
                      onClick={() => {
                        if (!locked) toggleSection(id, !checked);
                      }}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={locked}
                        onCheckedChange={(v) => toggleSection(id, v === true)}
                        onClick={(e) => e.stopPropagation()}
                        id={`section-${id}`}
                        className="size-4 shrink-0 rounded-[4px] border-[#0F6E56]/40 data-checked:border-[#0F6E56] data-checked:bg-[#0F6E56] data-checked:text-white dark:data-checked:border-[#0F6E56] dark:data-checked:bg-[#0F6E56]"
                      />
                      <label
                        htmlFor={`section-${id}`}
                        className="min-w-0 flex-1 cursor-pointer truncate font-normal"
                        onClick={(e) => e.preventDefault()}
                      >
                        {AUDIT_PACKAGE_SECTION_LABELS[id]}
                      </label>
                      <span
                        className="shrink-0 whitespace-nowrap text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400"
                        title={section?.reason}
                      >
                        {shortCount}
                      </span>
                      <span
                        className={cn(
                          "inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[10px] font-medium",
                          badgeClass(state)
                        )}
                      >
                        {badgeLabel(state)}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-3.5 grid grid-cols-1 gap-2.5 border-t border-border/60 pt-3.5 sm:grid-cols-2">
                <div>
                  <Label className="mb-1 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground">
                    Evidence from
                    <HelpTip content="Only evidence collected on or after this date is included in the export ZIP." />
                  </Label>
                  <Popover open={fromOpen} onOpenChange={setFromOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-9 w-full justify-start gap-2 text-[13px] font-normal"
                      >
                        <CalendarIcon className="size-3.5 text-muted-foreground" />
                        {range.from
                          ? format(range.from, "MMM d, yyyy")
                          : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={range.from}
                        onSelect={(day) => {
                          if (!day) return;
                          setRange((prev) => ({
                            from: day,
                            to: prev.to && prev.to < day ? day : prev.to,
                          }));
                          setFromOpen(false);
                        }}
                        defaultMonth={range.from}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="mb-1 text-[11.5px] font-medium text-muted-foreground">
                    Evidence through
                  </Label>
                  <Popover open={toOpen} onOpenChange={setToOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-9 w-full justify-start gap-2 text-[13px] font-normal"
                      >
                        <CalendarIcon className="size-3.5 text-muted-foreground" />
                        {range.to
                          ? format(range.to, "MMM d, yyyy")
                          : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={range.to}
                        onSelect={(day) => {
                          if (!day) return;
                          setRange((prev) => ({
                            from:
                              prev.from && prev.from > day ? day : prev.from,
                            to: day,
                          }));
                          setToOpen(false);
                        }}
                        defaultMonth={range.to ?? range.from}
                        disabled={range.from ? { before: range.from } : undefined}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <Button
                  variant="ghost"
                  className="h-8 text-[12.5px]"
                  onClick={() => setPreviewOpen(true)}
                >
                  Preview contents
                </Button>
                <Button
                  className="h-8 text-[12.5px]"
                  onClick={() => void startExport()}
                  disabled={!fromIso || !toIso}
                >
                  Generate audit package
                </Button>
              </div>
            </div>

            <div className="rounded-xl border bg-background p-4 shadow-xs">
              <p className="mb-3.5 text-[13px] font-medium">Package readiness</p>
              <div className="mb-3.5">
                <div className="mb-1.5 h-2 overflow-hidden rounded bg-muted">
                  <div
                    className={cn("h-full rounded transition-all", meterColor(percentReady))}
                    style={{ width: `${percentReady}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">
                    {selectedList.length} sections selected
                  </span>
                  <span className="font-medium">{percentReady}% ready</span>
                </div>
              </div>

              <div className="grid gap-0">
                {SIDEBAR_METRIC_IDS.map((id) => {
                  const section = readiness.find((s) => s.id === id);
                  const label =
                    id === "evidence"
                      ? "Evidence freshness"
                      : id === "policies"
                        ? "Policy coverage"
                        : id === "risk_assessment"
                          ? "Risk assessment"
                          : id === "baa"
                            ? "BAA coverage"
                            : "Training compliance";
                  const value = readinessLoading
                    ? "…"
                    : resolveShortCount(section);
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between gap-3 py-1.5 text-[12px]"
                    >
                      <span className="shrink-0 text-muted-foreground">
                        {label}
                      </span>
                      <span
                        className={cn(
                          "min-w-0 text-right font-medium leading-snug",
                          section
                            ? metricColor(section.state)
                            : "text-muted-foreground"
                        )}
                        title={section?.reason}
                      >
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 border-t border-border/60 pt-3">
                <p className="mb-1.5 text-[13px] font-medium">Package includes</p>
                <div className="text-[12px] leading-relaxed text-muted-foreground">
                  {PACKAGE_INCLUDES.map((line) => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      )}

      {phase === "progress" && (
        <div className="px-4 py-10 text-center">
          <div className="mx-auto mb-3.5 flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-800">
            <Download className="size-[22px]" strokeWidth={2} />
          </div>
          <div className="mb-1 text-base font-medium">Building your audit package</div>
          <div className="mb-4.5 text-[12.5px] text-muted-foreground">
            Gathering sections into a dated, organized ZIP.
          </div>
          <div className="mx-auto mb-2.5 h-1.5 w-[280px] overflow-hidden rounded-sm bg-muted">
            <div
              className="h-full rounded-sm bg-emerald-800 transition-all duration-400"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mx-auto flex max-w-lg flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
            {steps.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <Loader2 className="size-3 animate-spin" />
                Waiting for worker…
              </span>
            ) : (
              steps.map((step) => (
                <span
                  key={step.id}
                  className={cn(
                    "inline-flex items-center gap-1",
                    step.status === "done" && "text-emerald-800",
                    step.status === "running" && "font-medium text-foreground",
                    step.status === "pending" && "text-muted-foreground"
                  )}
                >
                  <StepIcon status={step.status} />
                  {step.label}
                </span>
              ))
            )}
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="px-4 py-8 text-center">
          <div className="mx-auto mb-3.5 flex size-11 items-center justify-center rounded-full bg-[#EAF3DE] text-[#3B6D11]">
            <Check className="size-[22px]" strokeWidth={2.5} />
          </div>
          <div className="mb-1 text-base font-medium">Audit package ready</div>
          <div className="mx-auto mb-4.5 max-w-[440px] text-[12.5px] text-muted-foreground">
            {packageSummary ||
              "Evidence, policies, risk assessment, BAA inventory, training records, and audit log — packaged and timestamped."}
          </div>

          <div className="mx-auto mt-4 flex max-w-[340px] items-center gap-3 rounded-lg bg-muted/60 px-3.5 py-3 text-left">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">
              <Download className="size-[18px]" strokeWidth={1.8} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium">{zipName}</div>
              <div className="mt-px text-[11px] text-muted-foreground">
                Generated{" "}
                {completedAt
                  ? format(completedAt, "MMM d, yyyy · h:mm a")
                  : "just now"}
              </div>
            </div>
            {signedUrl ? (
              <Button
                asChild
                size="sm"
                className="h-8 shrink-0 bg-brand px-3 text-xs text-brand-foreground hover:bg-brand-hover active:bg-brand-active"
              >
                <a href={signedUrl} target="_blank" rel="noopener noreferrer">
                  Download
                </a>
              </Button>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              className="h-8 text-[12.5px]"
              onClick={resetToConfig}
            >
              Configure new export
            </Button>
            <Button
              variant="outline"
              className="h-8 text-[12.5px]"
              onClick={() => setEmailOpen(true)}
            >
              Email to auditor
            </Button>
          </div>

          {emailSent ? (
            <p className="mt-3 text-[12.5px] text-emerald-800">
              Signed download link emailed. Delivery logged for chain of custody.
            </p>
          ) : null}

          {error ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Package contents</DialogTitle>
            <DialogDescription>
              Sections included in this export based on your checklist.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            {selectedList.map((id) => (
              <li key={id} className="flex items-center gap-2">
                <Check className="size-3.5 text-emerald-700" />
                {AUDIT_PACKAGE_SECTION_LABELS[id]}
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email to auditor</DialogTitle>
            <DialogDescription>
              Sends a read-only signed download URL (expires in 15 minutes). No
              file attachment — preserves chain of custody via audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="auditor-email">Auditor email</Label>
            <Input
              id="auditor-email"
              type="email"
              placeholder="auditor@firm.com"
              value={auditorEmail}
              onChange={(e) => setAuditorEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void sendToAuditor()}
              disabled={emailSending || !auditorEmail.trim()}
            >
              {emailSending ? "Sending…" : "Send link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AuditPackageExport() {
  return <AuditPackageWizard />;
}
