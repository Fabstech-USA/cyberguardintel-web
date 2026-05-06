"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, FilePlus, Plus } from "lucide-react";
import type { RiskAssessment } from "@/generated/prisma";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ThreatItem } from "@/lib/ai-risk-assessment";
import { cn } from "@/lib/utils";
import { ApproveDialog } from "./ApproveDialog";
import { DownloadPdfButton } from "./DownloadPdfButton";
import { ThreatCard } from "./risk-assessment-result/ThreatCard";
import {
  RISK_LEVEL_BADGE_CLASS,
  RISK_LEVEL_BAR_FILL,
  RISK_LEVEL_LABEL,
  RISK_ORDER,
  aiLevelFromPrisma,
  indexOfRiskLevel,
  type AiRiskLevel,
} from "./risk-assessment-result/risk-display";

type Recommendations = {
  executive_summary?: string;
  immediate?: string[];
  long_term?: string[];
};

type Vulnerability = { description: string };

type Props = {
  assessment: RiskAssessment;
  organizationName: string;
  approvedByName: string | null;
  canApprove: boolean;
  onStartNew: () => void;
  onApproved: (updated: RiskAssessment) => void;
};

function asThreats(value: unknown): ThreatItem[] {
  return Array.isArray(value) ? (value as ThreatItem[]) : [];
}

function asRecommendations(value: unknown): Recommendations {
  if (!value || typeof value !== "object") return {};
  return value as Recommendations;
}

function asVulnerabilities(value: unknown): Vulnerability[] {
  return Array.isArray(value) ? (value as Vulnerability[]) : [];
}

export function RiskAssessmentResult({
  assessment,
  organizationName,
  approvedByName,
  canApprove,
  onStartNew,
  onApproved,
}: Props): React.JSX.Element {
  const [approveOpen, setApproveOpen] = useState(false);
  const isDraft = assessment.status === "DRAFT";

  const overallLevel = aiLevelFromPrisma(assessment.riskLevel);
  const threats = useMemo(() => asThreats(assessment.threats), [
    assessment.threats,
  ]);
  const recommendations = useMemo(
    () => asRecommendations(assessment.recommendations),
    [assessment.recommendations]
  );
  const vulnerabilities = useMemo(
    () => asVulnerabilities(assessment.vulnerabilities),
    [assessment.vulnerabilities]
  );

  const threatCounts = useMemo(() => countByLevel(threats), [threats]);

  const subtitle = useMemo(() => {
    const lastGenerated = format(new Date(assessment.createdAt), "MMMM d, yyyy");
    const statusBlurb = isDraft
      ? "AI-drafted, pending your approval."
      : approvedByName
        ? `Approved by ${approvedByName}${
            assessment.approvedAt
              ? ` on ${format(new Date(assessment.approvedAt), "MMMM d, yyyy")}`
              : ""
          }.`
        : "Approved.";
    return `Annual HIPAA Security Risk Analysis per 45 CFR 164.308(a)(1). Last generated ${lastGenerated} \u00B7 v${assessment.version} \u00B7 ${statusBlurb}`;
  }, [assessment, approvedByName, isDraft]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Risk assessment</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DownloadPdfButton
            assessment={assessment}
            organizationName={organizationName}
            approvedByName={approvedByName}
          />
          <Button type="button" variant="outline" onClick={onStartNew}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Start new assessment
          </Button>
        </div>
      </div>

      {isDraft && (
        <Alert variant="warning" className="items-center">
          <AlertTriangle aria-hidden="true" />
          <div className="col-start-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-0.5">
              <AlertTitle>Draft - needs your review and approval</AlertTitle>
              <AlertDescription>
                AI-generated content. Review each threat and recommendation
                before marking as approved.
              </AlertDescription>
            </div>
            <div className="shrink-0">
              <Button
                type="button"
                onClick={() => setApproveOpen(true)}
                disabled={!canApprove}
                className="bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active"
                title={
                  canApprove
                    ? undefined
                    : "Only owners or admins can approve"
                }
              >
                Approve assessment
              </Button>
            </div>
          </div>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardContent className="space-y-2 p-5">
            <h2 className="text-sm font-semibold tracking-tight">
              Executive summary
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {recommendations.executive_summary ?? "No summary provided."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-sm font-semibold tracking-tight">Overall risk</h2>
            <div>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium",
                  RISK_LEVEL_BADGE_CLASS[overallLevel]
                )}
              >
                {RISK_LEVEL_LABEL[overallLevel]}
              </span>
            </div>
            <RiskGradientBar level={overallLevel} />
            <p className="text-xs text-muted-foreground">
              {summarizeThreats(threats.length, threatCounts)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="text-sm font-semibold tracking-tight">
            Identified threats
          </h2>
          <div className="space-y-2">
            {threats.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No threats were returned by the AI service.
              </p>
            ) : (
              threats.map((t, idx) => (
                <ThreatCard key={`${t.threat_name}-${idx}`} threat={t} />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {vulnerabilities.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-sm font-semibold tracking-tight">
              Critical gaps
            </h2>
            <ul className="space-y-1.5 text-sm">
              {vulnerabilities.map((v, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 leading-relaxed text-muted-foreground"
                >
                  <AlertTriangle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500"
                    aria-hidden="true"
                  />
                  <span>{v.description}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {recommendations.immediate && recommendations.immediate.length > 0 && (
        <ActionList
          title="Immediate actions (next 30 days)"
          items={recommendations.immediate}
        />
      )}
      {recommendations.long_term && recommendations.long_term.length > 0 && (
        <ActionList
          title="Long-term actions"
          items={recommendations.long_term}
          icon={
            <FilePlus
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          }
        />
      )}

      <ApproveDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        assessmentId={assessment.id}
        version={assessment.version}
        onApproved={(row) => {
          setApproveOpen(false);
          onApproved(row);
        }}
      />
    </div>
  );
}

function ActionList({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon?: React.ReactNode;
}): React.JSX.Element {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          {icon}
          {title}
        </h2>
        <ol className="space-y-2">
          {items.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm leading-relaxed"
            >
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-foreground">
                {idx + 1}
              </span>
              <span className="text-muted-foreground">{item}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function RiskGradientBar({ level }: { level: AiRiskLevel }): React.JSX.Element {
  const activeIdx = indexOfRiskLevel(level);
  return (
    <div className="flex h-1.5 gap-1 overflow-hidden rounded-full">
      {RISK_ORDER.map((l, idx) => (
        <div
          key={l}
          className={cn(
            "flex-1 rounded-full",
            idx === activeIdx ? RISK_LEVEL_BAR_FILL[l] : "bg-muted"
          )}
        />
      ))}
    </div>
  );
}

function countByLevel(
  threats: ReadonlyArray<ThreatItem>
): Record<AiRiskLevel, number> {
  const counts: Record<AiRiskLevel, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  for (const t of threats) counts[t.overall_risk] += 1;
  return counts;
}

function summarizeThreats(
  total: number,
  counts: Record<AiRiskLevel, number>
): string {
  if (total === 0) return "No threats identified";
  const parts: string[] = [];
  for (const level of [...RISK_ORDER].reverse()) {
    const c = counts[level];
    if (c > 0) parts.push(`${c} ${RISK_LEVEL_LABEL[level].toLowerCase()}`);
  }
  return `${total} threats \u00B7 ${parts.join(" \u00B7 ")}`;
}
