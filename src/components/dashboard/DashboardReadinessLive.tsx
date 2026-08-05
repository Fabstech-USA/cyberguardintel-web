"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { HelpTip } from "@/components/shared/HelpTip";
import {
  formatScoreBreakdownTeaser,
  ScoreContributionDetails,
} from "@/components/dashboard/ScoreContributionSection";
import { ReadinessGauge } from "@/components/hipaa/ReadinessGauge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReadinessScoreBreakdown } from "@/lib/readiness-score-breakdown";

const POLL_MS = 5000;

type ReadinessPayload = {
  score: number;
  scoreUpdatedAt: string | null;
  breakdown?: ReadinessScoreBreakdown;
};

type Props = {
  initialScore: number;
  initialBreakdown: ReadinessScoreBreakdown;
};

export function DashboardReadinessLive({
  initialScore,
  initialBreakdown,
}: Props): React.JSX.Element {
  const [score, setScore] = useState(initialScore);
  const [breakdown, setBreakdown] = useState(initialBreakdown);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const fetchScore = useCallback(async () => {
    try {
      const res = await fetch("/api/hipaa/readiness-score", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as ReadinessPayload;
      setScore(data.score);
      if (data.breakdown?.factors?.length) {
        setBreakdown(data.breakdown);
      }
    } catch {
      /* keep last known score */
    }
  }, []);

  useEffect(() => {
    setScore(initialScore);
  }, [initialScore]);

  useEffect(() => {
    setBreakdown(initialBreakdown);
  }, [initialBreakdown]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void fetchScore();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchScore]);

  const teaser = formatScoreBreakdownTeaser(breakdown);

  return (
    <Card
      data-tour="readiness-score"
      className="flex h-full flex-col border-border shadow-none"
    >
      <CardHeader className="shrink-0 pb-2">
        <CardTitle className="inline-flex items-center gap-1.5 text-base font-semibold">
          Readiness
          <HelpTip
            label="About readiness"
            content="Your overall HIPAA readiness score (0 to 100). It averages every control using evidence coverage, evidence freshness, approved policies, and assigned owners. Expand What makes up your score to see what is contributing and what is still missing."
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pb-4">
        <div className="flex flex-1 flex-col items-center justify-center py-2">
          <ReadinessGauge score={score} />
        </div>

        <Collapsible
          open={breakdownOpen}
          onOpenChange={setBreakdownOpen}
          className="shrink-0 border-t border-border pt-2"
        >
          <div className="flex items-start gap-1">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-start justify-between gap-3 rounded-md px-1 py-2 text-left transition-colors hover:bg-muted/40"
                aria-expanded={breakdownOpen}
              >
                <span className="min-w-0 space-y-0.5">
                  <span className="block text-sm font-semibold text-foreground">
                    What makes up your score
                  </span>
                  {!breakdownOpen ? (
                    <span className="block text-xs text-muted-foreground">
                      {teaser}
                    </span>
                  ) : null}
                </span>
                <ChevronDown
                  className={cn(
                    "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                    breakdownOpen && "rotate-180"
                  )}
                  aria-hidden
                />
              </button>
            </CollapsibleTrigger>
            <HelpTip
              label="About score contributions"
              content="Your readiness score averages every HIPAA control. Each control mixes four parts: evidence on the control (45%), how current that evidence is (25%), org-wide approved policies (20%), and an assigned owner (10%)."
            />
          </div>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-out data-[state=open]:animate-in">
            <ScoreContributionDetails
              breakdown={breakdown}
              hideSummary
              showActions
              className="px-1 pt-1 pb-2"
            />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
