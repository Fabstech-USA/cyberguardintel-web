"use client";

import { Check, Clock, Minus } from "lucide-react";

import type { TrainingBundle } from "@/lib/training-server";
import type { TrainingCellStatus, TrainingTopicKey } from "@/lib/training";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Employee = TrainingBundle["employees"][number];
type Topic = TrainingBundle["topics"][number];

const STATUS_STYLES: Record<
  TrainingCellStatus,
  { box: string; icon: string; Icon: typeof Check }
> = {
  complete: {
    box: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
    icon: "",
    Icon: Check,
  },
  upcoming: {
    box: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
    icon: "",
    Icon: Clock,
  },
  overdue: {
    box: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200",
    icon: "",
    Icon: Clock,
  },
  not_started: {
    box: "bg-muted text-muted-foreground",
    icon: "",
    Icon: Minus,
  },
};

function TrainingCell({
  cell,
}: {
  cell: Employee["cells"][TrainingTopicKey];
}) {
  const style = STATUS_STYLES[cell.status];
  const Icon = style.Icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "mx-auto inline-flex size-7 items-center justify-center rounded-md",
            style.box
          )}
        >
          <Icon className="size-3.5" strokeWidth={2.5} />
        </div>
      </TooltipTrigger>
      <TooltipContent>{cell.tooltip}</TooltipContent>
    </Tooltip>
  );
}

type TrainingMatrixProps = {
  topics: Topic[];
  employees: Employee[];
  canMutate: boolean;
  onDownloadCertificate: (employeeId: string) => void;
  downloadingEmployeeId: string | null;
};

export function TrainingMatrix({
  topics,
  employees,
  canMutate,
  onDownloadCertificate,
  downloadingEmployeeId,
}: TrainingMatrixProps) {
  if (employees.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No employees in roster yet. Add org members or record training for an
        external employee.
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="bg-muted/50 px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                Employee
              </th>
              {topics.map((topic) => (
                <th
                  key={topic.key}
                  className="bg-muted/50 px-2 py-2 text-center text-xs font-medium whitespace-nowrap text-muted-foreground"
                >
                  {topic.title}
                </th>
              ))}
              <th className="bg-muted/50 px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                Cert
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.employeeId} className="border-t">
                <td className="px-3 py-2.5">
                  <div className="font-medium">{employee.employeeName}</div>
                  {employee.jobTitle ? (
                    <div className="text-xs text-muted-foreground">
                      {employee.jobTitle}
                    </div>
                  ) : null}
                </td>
                {topics.map((topic) => (
                  <td key={topic.key} className="px-2 py-2.5 text-center">
                    <TrainingCell cell={employee.cells[topic.key]} />
                  </td>
                ))}
                <td className="px-2 py-2.5 text-center">
                  {employee.allTopicsComplete ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      className="h-6 text-[10px] text-[#0F6E56] dark:text-brand"
                      disabled={
                        !canMutate ||
                        downloadingEmployeeId === employee.employeeId
                      }
                      onClick={() =>
                        onDownloadCertificate(employee.employeeId)
                      }
                    >
                      {downloadingEmployeeId === employee.employeeId
                        ? "…"
                        : "PDF"}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        {(
          [
            [
              "complete",
              "Complete",
              "bg-emerald-100 border-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-700",
            ],
            [
              "upcoming",
              "Due within 30 days",
              "bg-amber-100 border-amber-300 dark:bg-amber-950/60 dark:border-amber-700",
            ],
            [
              "overdue",
              "Overdue",
              "bg-red-100 border-red-300 dark:bg-red-950/60 dark:border-red-800",
            ],
            [
              "not_started",
              "Not started",
              "bg-muted border-border dark:bg-muted dark:border-border",
            ],
          ] as const
        ).map(([key, label, classes]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn("size-2.5 rounded-sm border", classes)} />
            {label}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}
