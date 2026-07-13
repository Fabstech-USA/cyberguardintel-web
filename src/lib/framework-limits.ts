import type { PlanType } from "@/generated/prisma";

const PLAN_LIMITS: Record<PlanType, number> = {
  STARTER: 1,
  GROWTH: 1,
  BUSINESS: Number.POSITIVE_INFINITY,
  ENTERPRISE: Number.POSITIVE_INFINITY,
};

export class FrameworkLimitError extends Error {
  readonly code = "framework_limit_reached" as const;
  readonly used: number;
  readonly limit: number;
  readonly plan: PlanType;

  constructor(used: number, limit: number, plan: PlanType) {
    super(`Framework limit reached (${used}/${limit}) for ${plan} plan`);
    this.used = used;
    this.limit = limit;
    this.plan = plan;
  }
}

export function getFrameworkLimit(plan: PlanType): number {
  return PLAN_LIMITS[plan];
}

export function formatFrameworkLimit(limit: number): string {
  return Number.isFinite(limit) ? String(limit) : "Unlimited";
}
