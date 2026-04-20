/**
 * Plan catalog — single source of truth for plan display data.
 *
 * Prices in this PR are display-only; Stripe price IDs will be wired up in
 * a follow-up PR and can be added to each Plan entry then.
 */

export type PlanId = "STARTER" | "GROWTH" | "BUSINESS" | "ENTERPRISE";

/**
 * A plan feature bullet. String shorthand for features that ship today; use
 * the object form with `comingSoon: true` for features that are still
 * roadmap items but we want to advertise now (rendered greyed-out in the UI).
 */
export type PlanFeature = string | { label: string; comingSoon?: boolean };

export type Plan = {
  id: PlanId;
  name: string;
  tagline: string;
  employeeRange: string;
  /** Headline monthly price in USD cents (e.g. Starter $149 -> 14900). */
  monthlyPriceCents: number;
  /** Effective per-month price in USD cents when billed annually (20% off). */
  annualPriceCents: number;
  features: PlanFeature[];
  isMostPopular?: boolean;
  /** Enterprise has no self-serve checkout — card CTA links to sales. */
  isContactSales?: boolean;
};

export const PLANS: readonly Plan[] = [
  {
    id: "STARTER",
    name: "Starter",
    tagline: "Solo practitioners",
    employeeRange: "1–15 employees",
    monthlyPriceCents: 14_900,
    annualPriceCents: 11_900,
    features: [
      "1 framework (HIPAA today)",
      "AI risk assessment",
      "5 policies",
      "10 integrations",
      "BAA tracker",
      "Email support",
    ],
  },
  {
    id: "GROWTH",
    name: "Growth",
    tagline: "Growing organizations",
    employeeRange: "15–100 employees",
    monthlyPriceCents: 34_900,
    annualPriceCents: 27_900,
    isMostPopular: true,
    features: [
      "Everything in Starter",
      "50 integrations",
      "Full policy automation",
      "Audit readiness dashboard",
      "One-click audit export",
      "Live chat support",
    ],
  },
  {
    id: "BUSINESS",
    name: "Business",
    tagline: "Multi-framework",
    employeeRange: "100–300 employees",
    monthlyPriceCents: 64_900,
    annualPriceCents: 51_900,
    features: [
      "Everything in Growth",
      "100+ integrations",
      { label: "SOC 2 + PCI-DSS (v2)", comingSoon: true },
      "Cross-framework intelligence",
      "Continuous monitoring",
      "Founder onboarding call",
    ],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    tagline: "300+ employees · unlimited frameworks · dedicated success · SLA",
    employeeRange: "300+ employees",
    monthlyPriceCents: 120_000,
    annualPriceCents: 96_000,
    isContactSales: true,
    features: [
      "Unlimited frameworks",
      "Dedicated customer success",
      "Custom SLA",
      "SSO / SCIM provisioning",
      "Volume pricing starts at $1,200/mo",
    ],
  },
];

/**
 * Recommend a plan tier from the employeeCount collected at the Organization
 * step. Unknown / missing -> GROWTH (the "Most popular" fallback) so the UI
 * always has something to highlight.
 */
export function recommendedPlanFor(
  employeeCount: number | null | undefined
): PlanId {
  if (!employeeCount || employeeCount <= 0) return "GROWTH";
  if (employeeCount <= 15) return "STARTER";
  if (employeeCount <= 100) return "GROWTH";
  if (employeeCount <= 300) return "BUSINESS";
  return "ENTERPRISE";
}

export function getPlan(id: PlanId): Plan {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown plan id: ${id}`);
  return plan;
}

/** Sales contact for the Enterprise "Talk to us" CTA. */
export const ENTERPRISE_SALES_EMAIL = "sales@cyberguardintel.ai";
