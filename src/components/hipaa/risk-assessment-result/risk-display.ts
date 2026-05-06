import { RiskLevel } from "@/generated/prisma";

export type AiRiskLevel = "low" | "medium" | "high" | "critical";

const PRISMA_TO_AI: Record<RiskLevel, AiRiskLevel> = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

export function aiLevelFromPrisma(level: RiskLevel): AiRiskLevel {
  return PRISMA_TO_AI[level];
}

export const RISK_LEVEL_LABEL: Record<AiRiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

// Tailwind classes for the colored risk pills used throughout the result view.
// Tuned to read on both light and dark backgrounds.
export const RISK_LEVEL_BADGE_CLASS: Record<AiRiskLevel, string> = {
  low: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  medium:
    "bg-amber-500/15 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  high: "bg-orange-500/15 text-orange-800 dark:bg-orange-400/20 dark:text-orange-300",
  critical:
    "bg-rose-500/15 text-rose-800 dark:bg-rose-400/20 dark:text-rose-300",
};

// Color classes for the gradient bar's filled segment under the OverallRisk card.
export const RISK_LEVEL_BAR_FILL: Record<AiRiskLevel, string> = {
  low: "bg-emerald-500",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-rose-500",
};

const ORDER: AiRiskLevel[] = ["low", "medium", "high", "critical"];

export function indexOfRiskLevel(level: AiRiskLevel): number {
  return ORDER.indexOf(level);
}

export const RISK_ORDER: ReadonlyArray<AiRiskLevel> = ORDER;
