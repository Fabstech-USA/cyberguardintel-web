"use client";

import { useCallback, useEffect, useState } from "react";
import { HelpTip } from "@/components/shared/HelpTip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReadinessGauge } from "@/components/hipaa/ReadinessGauge";

const POLL_MS = 5000;

type ReadinessPayload = {
  score: number;
  scoreUpdatedAt: string | null;
};

type Props = {
  initialScore: number;
};

export function DashboardReadinessLive({
  initialScore,
}: Props): React.JSX.Element {
  const [score, setScore] = useState(initialScore);

  const fetchScore = useCallback(async () => {
    try {
      const res = await fetch("/api/hipaa/readiness-score", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as ReadinessPayload;
      setScore(data.score);
    } catch {
      /* keep last known score */
    }
  }, []);

  useEffect(() => {
    setScore(initialScore);
  }, [initialScore]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void fetchScore();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchScore]);

  return (
    <Card
      data-tour="readiness-score"
      className="h-full border-border shadow-none"
    >
      <CardHeader className="pb-2">
        <CardTitle className="inline-flex items-center gap-1.5 text-base font-semibold">
          Readiness
          <HelpTip
            label="About readiness"
            content="Your overall HIPAA readiness score (0 to 100) based on evidence, policies, BAAs, training, and other controls. Aim higher before an audit. Gaps pull this number down."
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center pb-6">
        <ReadinessGauge score={score} />
      </CardContent>
    </Card>
  );
}
