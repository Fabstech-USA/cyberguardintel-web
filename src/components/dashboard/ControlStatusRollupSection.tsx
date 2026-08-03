"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { HelpTip } from "@/components/shared/HelpTip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  controlStatusRollupSegments,
  type ControlStatusRollup,
} from "@/lib/dashboard-control-status";
import { controlsHrefForStatus } from "@/lib/hipaa-control-status-shared";
import { ControlStatus } from "@/generated/prisma";

const POLL_MS = 5000;

type Props = {
  initialRollup: ControlStatusRollup;
};

/** Fill colors for pie slices (SVG, not Tailwind classes). */
const SEGMENT_FILLS: Record<string, string> = {
  implemented: "#34d399",
  inProgress: "#f59e0b",
  needsReview: "#38bdf8",
  exception: "#a78bfa",
  notStarted: "#94a3b8",
};

const SEGMENT_DOT: Record<string, string> = {
  implemented: "bg-emerald-400",
  inProgress: "bg-amber-500",
  needsReview: "bg-sky-400",
  exception: "bg-violet-400",
  notStarted: "bg-slate-400",
};

type PieRow = {
  key: string;
  name: string;
  value: number;
  fill: string;
  status: ControlStatus;
};

export function ControlStatusRollupSection({
  initialRollup,
}: Props): React.JSX.Element {
  const router = useRouter();
  const [rollup, setRollup] = useState(initialRollup);

  const fetchRollup = useCallback(async () => {
    try {
      const res = await fetch("/api/hipaa/readiness-score", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { statusRollup?: ControlStatusRollup };
      if (data.statusRollup) setRollup(data.statusRollup);
    } catch {
      /* keep last known */
    }
  }, []);

  useEffect(() => {
    setRollup(initialRollup);
  }, [initialRollup]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void fetchRollup();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchRollup]);

  const segments = controlStatusRollupSegments(rollup);
  const pieData: PieRow[] = useMemo(
    () =>
      segments
        .filter((segment) => segment.count > 0)
        .map((segment) => ({
          key: segment.key,
          name: segment.label,
          value: segment.count,
          fill: SEGMENT_FILLS[segment.key] ?? "#94a3b8",
          status: segment.status,
        })),
    [segments]
  );

  return (
    <Card
      data-tour="control-status-rollup"
      className="border-border shadow-none"
    >
      <CardHeader className="pb-2">
        <CardTitle className="inline-flex items-center gap-1.5 text-base font-semibold">
          Control implementation status
          <HelpTip
            label="About control status"
            content="Status tracks whether each HIPAA control is Not started, In progress, Implemented, Needs review, or Exception. It is separate from the readiness score. Assigning an owner or adding evidence moves Not started to In progress. Mark Implemented on the Controls page or by confirming safeguards in the risk assessment wizard."
          />
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {rollup.total} HIPAA control{rollup.total === 1 ? "" : "s"} ·{" "}
          {rollup.implemented} implemented
        </p>
      </CardHeader>
      <CardContent className="pb-6">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
          <div
            className="relative mx-auto h-44 w-44"
            role="img"
            aria-label={`Control status pie chart. ${rollup.implemented} of ${rollup.total} implemented.`}
          >
            {pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-full border border-dashed border-border text-xs text-muted-foreground">
                No controls yet
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={pieData.length > 1 ? 2 : 0}
                      stroke="none"
                      className="cursor-pointer outline-none"
                      onClick={(_, index) => {
                        const row = pieData[index];
                        if (!row) return;
                        router.push(controlsHrefForStatus(row.status));
                      }}
                    >
                      {pieData.map((row) => (
                        <Cell key={row.key} fill={row.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [
                        typeof value === "number" ? value : String(value ?? ""),
                        "Controls",
                      ]}
                      contentStyle={{
                        borderRadius: "0.5rem",
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--popover))",
                        color: "hsl(var(--popover-foreground))",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-semibold tabular-nums text-foreground">
                    {rollup.implemented}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    implemented
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {segments.map((segment) => (
              <Link
                key={segment.key}
                href={segment.href}
                className="rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        SEGMENT_DOT[segment.key] ?? "bg-muted"
                      )}
                    />
                    {segment.label}
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {segment.count}
                  </span>
                </div>
                {rollup.total > 0 ? (
                  <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
                    {Math.round((segment.count / rollup.total) * 100)}% of
                    controls
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
