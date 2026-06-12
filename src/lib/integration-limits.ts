import type { PlanType } from "@/generated/prisma";

const PLAN_LIMITS: Record<PlanType, number> = {
  STARTER: 10,
  GROWTH: 50,
  BUSINESS: 100,
  ENTERPRISE: Number.POSITIVE_INFINITY,
};

export class IntegrationLimitError extends Error {
  readonly code = "integration_limit_reached" as const;
  readonly used: number;
  readonly limit: number;
  readonly plan: PlanType;

  constructor(used: number, limit: number, plan: PlanType) {
    super(`Integration limit reached (${used}/${limit}) for ${plan} plan`);
    this.used = used;
    this.limit = limit;
    this.plan = plan;
  }
}

export function getIntegrationLimit(plan: PlanType): number {
  return PLAN_LIMITS[plan];
}

export function formatIntegrationLimit(limit: number): string {
  return Number.isFinite(limit) ? String(limit) : "Unlimited";
}
