/**
 * Transient onboarding state that lives only in sessionStorage.
 *
 * Plan + period are collected in the first two wizard steps (Plan + Welcome)
 * *before* an Organization row exists in the database. Stashing them here
 * means a user who abandons onboarding before Step 1/4 simply loses their
 * choice — no zombie org rows, no partial commits. At Step 1/4 we send both
 * along with the org details so everything persists atomically.
 *
 * This is intentionally dumb: no reactivity, no cross-tab sync. If the user
 * opens the wizard in a second tab they'll just be asked to pick a plan again.
 */

import type { PlanId } from "@/lib/plans";

const PLAN_KEY = "cgi.onboarding.plan";
const PERIOD_KEY = "cgi.onboarding.period";

export type OnboardingBillingPeriod = "MONTHLY" | "ANNUAL";

export type OnboardingPlanSelection = {
  plan: PlanId;
  period: OnboardingBillingPeriod;
};

function isPlanId(value: string): value is PlanId {
  return (
    value === "STARTER" ||
    value === "GROWTH" ||
    value === "BUSINESS" ||
    value === "ENTERPRISE"
  );
}

function isPeriod(value: string): value is OnboardingBillingPeriod {
  return value === "MONTHLY" || value === "ANNUAL";
}

export function savePlanSelection(selection: OnboardingPlanSelection): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PLAN_KEY, selection.plan);
  window.sessionStorage.setItem(PERIOD_KEY, selection.period);
}

export function readPlanSelection(): OnboardingPlanSelection | null {
  if (typeof window === "undefined") return null;
  const plan = window.sessionStorage.getItem(PLAN_KEY);
  const period = window.sessionStorage.getItem(PERIOD_KEY);
  if (!plan || !period) return null;
  if (!isPlanId(plan) || !isPeriod(period)) return null;
  return { plan, period };
}

export function clearPlanSelection(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PLAN_KEY);
  window.sessionStorage.removeItem(PERIOD_KEY);
}
