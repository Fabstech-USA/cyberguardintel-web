import type { BillingPeriod, PlanType } from "@/generated/prisma";

export type PlanPeriodMapping = {
  plan: PlanType;
  period: BillingPeriod;
};

type PriceEnv = Record<string, string | undefined>;

const SELF_SERVE_PLANS = ["STARTER", "GROWTH", "BUSINESS"] as const;
export type SelfServePlan = (typeof SELF_SERVE_PLANS)[number];

export function isSelfServePlan(plan: string): plan is SelfServePlan {
  return (SELF_SERVE_PLANS as readonly string[]).includes(plan);
}

/** Resolve Stripe Price ID for a self-serve plan + billing period. */
export function getPriceIdForPlan(
  plan: SelfServePlan,
  period: BillingPeriod,
  env: PriceEnv = process.env
): string | null {
  const key =
    plan === "STARTER"
      ? period === "ANNUAL"
        ? "STRIPE_STARTER_ANNUAL_PRICE_ID"
        : "STRIPE_STARTER_MONTHLY_PRICE_ID"
      : plan === "GROWTH"
        ? period === "ANNUAL"
          ? "STRIPE_GROWTH_ANNUAL_PRICE_ID"
          : "STRIPE_GROWTH_MONTHLY_PRICE_ID"
        : period === "ANNUAL"
          ? "STRIPE_BUSINESS_ANNUAL_PRICE_ID"
          : "STRIPE_BUSINESS_MONTHLY_PRICE_ID";

  const priceId = env[key];
  if (!priceId || priceId === "price_...") return null;
  return priceId;
}

/** Build price-id → plan/period map from env. Missing IDs are omitted. */
export function buildPriceToPlanMap(
  env: PriceEnv = process.env
): Map<string, PlanPeriodMapping> {
  const entries: Array<[string | undefined, PlanPeriodMapping]> = [
    [env.STRIPE_STARTER_MONTHLY_PRICE_ID, { plan: "STARTER", period: "MONTHLY" }],
    [env.STRIPE_STARTER_ANNUAL_PRICE_ID, { plan: "STARTER", period: "ANNUAL" }],
    [env.STRIPE_GROWTH_MONTHLY_PRICE_ID, { plan: "GROWTH", period: "MONTHLY" }],
    [env.STRIPE_GROWTH_ANNUAL_PRICE_ID, { plan: "GROWTH", period: "ANNUAL" }],
    [
      env.STRIPE_BUSINESS_MONTHLY_PRICE_ID,
      { plan: "BUSINESS", period: "MONTHLY" },
    ],
    [env.STRIPE_BUSINESS_ANNUAL_PRICE_ID, { plan: "BUSINESS", period: "ANNUAL" }],
  ];

  const map = new Map<string, PlanPeriodMapping>();
  for (const [priceId, mapping] of entries) {
    if (priceId && priceId !== "price_...") {
      map.set(priceId, mapping);
    }
  }
  return map;
}

export function mapPriceIdToPlan(
  priceId: string,
  env: PriceEnv = process.env
): PlanPeriodMapping | null {
  return buildPriceToPlanMap(env).get(priceId) ?? null;
}
