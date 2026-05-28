"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";

import type { TrainingBundle } from "@/lib/training-server";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useHipaaToast } from "@/components/hipaa/use-hipaa-toast";
import { HipaaStatCard } from "@/components/hipaa/HipaaStatCard";
import { hipaaStatUi } from "@/components/hipaa/hipaa-stat-ui";
import { Button } from "@/components/ui/button";
import { RecordTrainingDialog } from "@/components/hipaa/RecordTrainingDialog";
import { TrainingMatrix } from "@/components/hipaa/TrainingMatrix";

type TrainingRecordsClientProps = {
  bundle: TrainingBundle;
  canMutate: boolean;
};

type TrainingStatusFilter =
  | "all"
  | "complete"
  | "overdue"
  | "upcoming"
  | "in_progress"
  | "not_started";

const trainingUi = {
  statEmployees: hipaaStatUi.statDefault,
  statOk: hipaaStatUi.statOk,
  statWarn: hipaaStatUi.statWarn,
  statDanger: hipaaStatUi.statDanger,
  pageDesc: hipaaStatUi.pageDesc,
  btnGhost:
    "border-[rgba(0,0,0,0.22)] bg-white text-[#1a1a1a] hover:bg-[#f5f5f0] dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-muted",
  btnPrimary:
    "border-transparent bg-[#0F6E56] text-white hover:bg-[#085041] active:bg-[#04342C] dark:bg-brand dark:text-brand-foreground dark:hover:bg-brand-hover dark:active:bg-brand-active",
} as const;

function completionStatClass(pct: number): string {
  if (pct >= 90) return trainingUi.statOk;
  if (pct >= 70) return trainingUi.statWarn;
  return trainingUi.statDanger;
}

const FILTER_LABELS: Record<TrainingStatusFilter, string> = {
  all: "All",
  complete: "Complete",
  overdue: "Overdue",
  upcoming: "Upcoming",
  in_progress: "In progress",
  not_started: "Not started",
};

export function TrainingRecordsClient({
  bundle,
  canMutate,
}: TrainingRecordsClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState<TrainingStatusFilter>("all");
  const [reminderLoading, setReminderLoading] = useState(false);
  const [downloadingEmployeeId, setDownloadingEmployeeId] = useState<
    string | null
  >(null);
  const { showToast, HipaaToast } = useHipaaToast();

  const { summary } = bundle;

  const employeeStatusById = useMemo(() => {
    const map = new Map<string, TrainingStatusFilter>();

    for (const employee of bundle.employees) {
      if (employee.allTopicsComplete) {
        map.set(employee.employeeId, "complete");
        continue;
      }

      const statuses = Object.values(employee.cells).map((cell) => cell.status);
      if (statuses.some((s) => s === "overdue")) {
        map.set(employee.employeeId, "overdue");
        continue;
      }
      if (statuses.some((s) => s === "upcoming")) {
        map.set(employee.employeeId, "upcoming");
        continue;
      }

      const hasAnyStarted = statuses.some((s) => s !== "not_started");
      map.set(employee.employeeId, hasAnyStarted ? "in_progress" : "not_started");
    }

    return map;
  }, [bundle.employees]);

  const countsByFilter = useMemo(() => {
    const counts: Record<TrainingStatusFilter, number> = {
      all: bundle.employees.length,
      complete: 0,
      overdue: 0,
      upcoming: 0,
      in_progress: 0,
      not_started: 0,
    };

    for (const employee of bundle.employees) {
      const status = employeeStatusById.get(employee.employeeId);
      if (!status) continue;
      counts[status] += 1;
    }

    return counts;
  }, [bundle.employees, employeeStatusById]);

  const visibleEmployees = useMemo(() => {
    if (filter === "all") return bundle.employees;
    return bundle.employees.filter(
      (employee) => employeeStatusById.get(employee.employeeId) === filter
    );
  }, [bundle.employees, employeeStatusById, filter]);

  function handleTrainingRecorded(count: number, employeeName: string) {
    const multiEmployee = employeeName.includes("employees");
    showToast(
      "success",
      count === 1 ? "Training recorded" : `${count} records saved`,
      count === 1
        ? `Recorded completion for ${employeeName}. Attestation PDF generated; annual due date set automatically.`
        : multiEmployee
          ? `Saved ${count} training completions across ${employeeName}. Attestation PDFs generated for each row.`
          : `Saved ${count} training completions for ${employeeName}. Attestation PDFs generated for each row.`
    );
  }

  async function sendReminders() {
    setReminderLoading(true);
    try {
      const res = await fetch("/api/hipaa/training/reminders", {
        method: "POST",
      });
      const data = (await res.json()) as {
        sent?: number;
        scanned?: number;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to send reminders");

      const sent = data.sent ?? 0;
      const scanned = data.scanned ?? 0;

      if (sent > 0) {
        showToast(
          "success",
          `${sent} reminder${sent === 1 ? "" : "s"} sent`,
          `Email${sent === 1 ? "" : "s"} sent to employees with upcoming or overdue training (${sent} of ${scanned} tracked completion${scanned === 1 ? "" : "s"}).`
        );
      } else {
        showToast(
          "success",
          "No reminders sent",
          scanned > 0
            ? `None of the ${scanned} tracked completions are upcoming or overdue (due within 30 days or past due).`
            : "No training records to evaluate. Record completions first."
        );
      }
    } catch (err) {
      showToast(
        "error",
        "Reminders failed",
        err instanceof Error ? err.message : "Failed to send reminders"
      );
    } finally {
      setReminderLoading(false);
    }
  }

  async function downloadCertificate(employeeId: string) {
    setDownloadingEmployeeId(employeeId);
    try {
      const res = await fetch(
        `/api/hipaa/training/employee-certificate?employeeId=${encodeURIComponent(employeeId)}`
      );
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Failed to download certificate");
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      showToast(
        "error",
        "Download failed",
        err instanceof Error ? err.message : "Failed to download certificate"
      );
    } finally {
      setDownloadingEmployeeId(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <HipaaToast />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Training records</h1>
          <p className={cn("mt-1 max-w-2xl", trainingUi.pageDesc)}>
            Annual HIPAA workforce training per 45 CFR 164.308(a)(5). Track
            completion, generate attestation certificates, and get alerts before
            annual deadlines lapse.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            className={trainingUi.btnGhost}
            disabled={!canMutate || reminderLoading}
            onClick={() => void sendReminders()}
          >
            {reminderLoading ? "Sending…" : "Send reminders"}
          </Button>
          <Button
            type="button"
            className={trainingUi.btnPrimary}
            disabled={!canMutate}
            onClick={() => setDialogOpen(true)}
          >
            Record training
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HipaaStatCard
          label="Employees"
          value={summary.employeeCount}
          valueClassName={trainingUi.statEmployees}
        />
        <HipaaStatCard
          label="Completion"
          value={`${summary.completionPct}%`}
          valueClassName={completionStatClass(summary.completionPct)}
        />
        <HipaaStatCard
          label="Overdue"
          value={summary.overdueCount}
          valueClassName={
            summary.overdueCount > 0 ? trainingUi.statDanger : trainingUi.statOk
          }
        />
        <HipaaStatCard
          label="Upcoming (30d)"
          value={summary.upcomingCount}
          valueClassName={
            summary.upcomingCount > 0
              ? trainingUi.statWarn
              : trainingUi.statOk
          }
        />
      </div>

      {summary.overdueCount > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>
            {summary.overdueCount} overdue training
            {summary.overdueCount === 1 ? "" : "s"}
          </AlertTitle>
          <AlertDescription>
            HIPAA 164.308(a)(5) requires documented annual training with
            attestation for every workforce member.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(Object.keys(FILTER_LABELS) as TrainingStatusFilter[]).map((key) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={filter === key ? "default" : "outline"}
            onClick={() => setFilter(key)}
          >
            {FILTER_LABELS[key]} ({countsByFilter[key]})
          </Button>
        ))}
      </div>

      {visibleEmployees.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No employees match the current filter.
        </div>
      ) : (
        <TrainingMatrix
          topics={bundle.topics}
          employees={visibleEmployees}
          canMutate={canMutate}
          onDownloadCertificate={(id) => void downloadCertificate(id)}
          downloadingEmployeeId={downloadingEmployeeId}
        />
      )}

      <RecordTrainingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        roster={bundle.roster}
        onRecorded={handleTrainingRecorded}
        onRecordError={(message) =>
          showToast("error", "Could not save training", message)
        }
      />
    </div>
  );
}
