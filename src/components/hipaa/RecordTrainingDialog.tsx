"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

import { TRAINING_TOPICS } from "@/lib/training";
import type { TrainingBundle } from "@/lib/training-server";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RosterEntry = TrainingBundle["roster"][number];

type CreatedRecord = {
  employeeName: string;
  trainingTitle: string;
};

type RecordTrainingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roster: RosterEntry[];
  onRecorded?: (count: number, employeeName: string) => void;
  onRecordError?: (message: string) => void;
};

type Mode = "single" | "bulk";

const EXTERNAL_VALUE = "__external__";

function parseCreatedResponse(
  data: unknown
): CreatedRecord[] {
  if (!data || typeof data !== "object") return [];
  const created = (data as { created?: unknown }).created;
  if (Array.isArray(created)) {
    return created.filter(
      (row): row is CreatedRecord =>
        typeof row === "object" &&
        row !== null &&
        typeof (row as CreatedRecord).employeeName === "string" &&
        typeof (row as CreatedRecord).trainingTitle === "string"
    );
  }
  if (
    typeof (data as CreatedRecord).employeeName === "string" &&
    typeof (data as CreatedRecord).trainingTitle === "string"
  ) {
    return [data as CreatedRecord];
  }
  return [];
}

export function RecordTrainingDialog({
  open,
  onOpenChange,
  roster,
  onRecorded,
  onRecordError,
}: RecordTrainingDialogProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("single");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [employeeSelect, setEmployeeSelect] = useState(
    roster[0]?.employeeId ?? EXTERNAL_VALUE
  );
  const [externalName, setExternalName] = useState("");
  const [externalEmail, setExternalEmail] = useState("");
  const [externalId, setExternalId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(
    () => new Set([TRAINING_TOPICS[0].title])
  );
  const [completedAt, setCompletedAt] = useState(
    format(new Date(), "yyyy-MM-dd")
  );

  const [bulkText, setBulkText] = useState("");

  const selectedRoster = useMemo(
    () => roster.find((r) => r.employeeId === employeeSelect),
    [roster, employeeSelect]
  );

  const isExternal = employeeSelect === EXTERNAL_VALUE;

  useEffect(() => {
    if (isExternal) return;
    setJobTitle(selectedRoster?.jobTitle ?? "");
  }, [employeeSelect, isExternal, selectedRoster?.jobTitle]);

  function resolveEmployee(): {
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    employeeJobTitle: string | null;
  } | null {
    if (isExternal) {
      if (!externalName.trim() || !externalEmail.trim() || !externalId.trim()) {
        return null;
      }
      const title = jobTitle.trim();
      return {
        employeeId: externalId.trim(),
        employeeName: externalName.trim(),
        employeeEmail: externalEmail.trim(),
        employeeJobTitle: title.length > 0 ? title : null,
      };
    }
    if (!selectedRoster) return null;
    const title = jobTitle.trim();
    return {
      employeeId: selectedRoster.employeeId,
      employeeName: selectedRoster.employeeName,
      employeeEmail: selectedRoster.employeeEmail,
      employeeJobTitle: title.length > 0 ? title : null,
    };
  }

  function toggleTopic(title: string, checked: boolean) {
    setSelectedTopics((prev) => {
      const next = new Set(prev);
      if (checked) next.add(title);
      else next.delete(title);
      return next;
    });
  }

  function selectAllTopics() {
    setSelectedTopics(new Set(TRAINING_TOPICS.map((t) => t.title)));
  }

  async function submitSingle() {
    const employee = resolveEmployee();
    if (!employee) {
      setError("Employee details are required.");
      return;
    }
    if (selectedTopics.size === 0) {
      setError("Select at least one training topic.");
      return;
    }

    const completedAtIso = new Date(`${completedAt}T12:00:00Z`).toISOString();
    const records = [...selectedTopics].map((trainingTitle) => ({
      ...employee,
      trainingTitle,
      completedAt: completedAtIso,
    }));

    setLoading(true);
    setError(null);
    try {
      const body =
        records.length === 1 ? records[0] : { records };
      const res = await fetch("/api/hipaa/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to record training");
      }
      const data: unknown = await res.json();
      const created = parseCreatedResponse(data);
      const employeeName =
        created[0]?.employeeName ?? employee.employeeName;
      onRecorded?.(created.length || records.length, employeeName);
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to record training";
      setError(message);
      onRecordError?.(message);
    } finally {
      setLoading(false);
    }
  }

  function parseBulkRows(): Array<{
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    employeeJobTitle: string | null;
    trainingTitle: string;
    completedAt: string;
  }> {
    const lines = bulkText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const records: Array<{
      employeeId: string;
      employeeName: string;
      employeeEmail: string;
      employeeJobTitle: string | null;
      trainingTitle: string;
      completedAt: string;
    }> = [];

    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      if (parts.length < 5) continue;

      let employeeId: string;
      let employeeName: string;
      let employeeEmail: string;
      let employeeJobTitle: string | null = null;
      let title: string;
      let date: string;

      if (parts.length >= 6) {
        [employeeId, employeeName, employeeEmail, employeeJobTitle, title, date] =
          parts;
        employeeJobTitle = employeeJobTitle?.trim() || null;
      } else {
        [employeeId, employeeName, employeeEmail, title, date] = parts;
      }

      if (!TRAINING_TOPICS.some((t) => t.title === title)) continue;
      records.push({
        employeeId,
        employeeName,
        employeeEmail,
        employeeJobTitle,
        trainingTitle: title,
        completedAt: new Date(`${date}T12:00:00Z`).toISOString(),
      });
    }
    return records;
  }

  async function submitBulk() {
    const records = parseBulkRows();
    if (records.length === 0) {
      setError(
        "Add at least one valid row. Format: employeeId, name, email, role, topic title, YYYY-MM-DD"
      );
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/hipaa/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to record training");
      }
      const data: unknown = await res.json();
      const created = parseCreatedResponse(data);
      const count = created.length || records.length;
      const uniqueNames = [...new Set(created.map((r) => r.employeeName))];
      const employeeName =
        uniqueNames.length === 1
          ? uniqueNames[0]
          : `${uniqueNames.length} employees`;
      onRecorded?.(count, employeeName);
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to record training";
      setError(message);
      onRecordError?.(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record training</DialogTitle>
          <DialogDescription>
            Log HIPAA workforce training completion. Annual due dates are
            computed automatically (completed + 1 year).
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "single" ? "default" : "outline"}
            onClick={() => setMode("single")}
          >
            Single
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "bulk" ? "default" : "outline"}
            onClick={() => setMode("bulk")}
          >
            Bulk / annual cycle
          </Button>
        </div>

        {mode === "single" ? (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Employee</Label>
              <Select value={employeeSelect} onValueChange={setEmployeeSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {roster.map((r) => (
                    <SelectItem key={r.employeeId} value={r.employeeId}>
                      {r.employeeName}
                    </SelectItem>
                  ))}
                  <SelectItem value={EXTERNAL_VALUE}>
                    External employee…
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isExternal ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="ext-id">Employee ID</Label>
                  <Input
                    id="ext-id"
                    value={externalId}
                    onChange={(e) => setExternalId(e.target.value)}
                    placeholder="ext_jane_doe"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ext-name">Name</Label>
                  <Input
                    id="ext-name"
                    value={externalName}
                    onChange={(e) => setExternalName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ext-email">Email</Label>
                  <Input
                    id="ext-email"
                    type="email"
                    value={externalEmail}
                    onChange={(e) => setExternalEmail(e.target.value)}
                  />
                </div>
              </>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="job-title">Role / job title</Label>
              <Input
                id="job-title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Physician, Office Manager"
              />
              <p className="text-xs text-muted-foreground">
                Shown under the employee name in the training matrix. Org
                members may already have a title from onboarding; recording
                training can update it here.
              </p>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Training topics</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="h-6 text-xs"
                  onClick={selectAllTopics}
                >
                  Select all
                </Button>
              </div>
              <div className="grid gap-1.5 rounded-lg border p-2">
                {TRAINING_TOPICS.map((topic) => {
                  const checked = selectedTopics.has(topic.title);
                  const inputId = `training-topic-${topic.key}`;
                  return (
                    <label
                      key={topic.key}
                      htmlFor={inputId}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                        checked
                          ? "bg-brand/10 text-foreground"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <Checkbox
                        id={inputId}
                        checked={checked}
                        onCheckedChange={(value) =>
                          toggleTopic(topic.title, value === true)
                        }
                      />
                      {topic.title}
                    </label>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedTopics.size} of {TRAINING_TOPICS.length} selected — same
                completion date applies to all.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="completed-at">Completed date</Label>
              <Input
                id="completed-at"
                type="date"
                value={completedAt}
                onChange={(e) => setCompletedAt(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            <Label htmlFor="bulk-rows">CSV rows (one per line)</Label>
            <textarea
              id="bulk-rows"
              className="min-h-[160px] w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-xs"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={
                "user_abc,Jane Doe,jane@clinic.com,Physician,HIPAA Privacy,2026-03-15\nuser_abc,Jane Doe,jane@clinic.com,Physician,HIPAA Security,2026-03-15"
              }
            />
            <p className="text-xs text-muted-foreground">
              Columns: employeeId, name, email, role (optional), topic title
              (exact), YYYY-MM-DD. Five-column rows without role still work.
            </p>
          </div>
        )}

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => (mode === "single" ? submitSingle() : submitBulk())}
            disabled={loading}
          >
            {loading ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
