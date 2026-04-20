import type { PlanType } from "@/generated/prisma";

const LABELS: Record<PlanType, string> = {
  STARTER: "Starter",
  GROWTH: "Growth",
  BUSINESS: "Business",
  ENTERPRISE: "Enterprise",
};

export function formatPlanLabel(plan: PlanType): string {
  return LABELS[plan] ?? plan;
}

export function isTrialActive(trialEndsAt: Date | null | undefined): boolean {
  if (!trialEndsAt) return false;
  return trialEndsAt.getTime() > Date.now();
}

/** Label for the header chip, e.g. "Growth · Trial". */
export function formatPlanChipText(
  plan: PlanType,
  trialEndsAt: Date | null | undefined
): string {
  const base = formatPlanLabel(plan);
  return isTrialActive(trialEndsAt) ? `${base} · Trial` : base;
}
