"use client";

import { useState } from "react";
import { Building2, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ENTERPRISE_SALES_EMAIL,
  PLANS,
  type Plan,
  type PlanFeature,
  type PlanId,
} from "@/lib/plans";
import { savePlanSelection } from "@/lib/onboarding-storage";

function normalizeFeature(
  feature: PlanFeature
): { label: string; comingSoon: boolean } {
  return typeof feature === "string"
    ? { label: feature, comingSoon: false }
    : { label: feature.label, comingSoon: !!feature.comingSoon };
}

type BillingPeriod = "MONTHLY" | "ANNUAL";

type Props = {
  recommendedPlan?: PlanId;
  onComplete: (plan: PlanId, period: BillingPeriod) => void;
};

function formatPrice(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

const SELF_SERVE_PLANS: readonly Plan[] = PLANS.filter((p) => !p.isContactSales);
const ENTERPRISE_PLAN = PLANS.find((p) => p.isContactSales);

export function SelectPlanStep({
  recommendedPlan,
  onComplete,
}: Props): React.JSX.Element {
  const [period, setPeriod] = useState<BillingPeriod>("MONTHLY");
  const [submittingPlan, setSubmittingPlan] = useState<PlanId | null>(null);
  // Kept for UX parity with other steps even though the current codepath
  // can't fail — sessionStorage writes are synchronous and non-throwing.
  const [error, setError] = useState<string | null>(null);

  function handleSelect(plan: PlanId): void {
    // Plan is client-only until Step 1/4 (Org details) commits it alongside
    // the org record in a single POST. Stashing in sessionStorage avoids
    // creating a zombie org row for users who abandon before filling out
    // their org details.
    setSubmittingPlan(plan);
    setError(null);
    try {
      savePlanSelection({ plan, period });
      onComplete(plan, period);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmittingPlan(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Start your 14-day free trial
        </h2>
        <p className="text-sm text-muted-foreground">
          No credit card required. Cancel anytime. Upgrade or downgrade as you
          grow.
        </p>
      </div>

      <div className="flex justify-center">
        <div
          role="tablist"
          aria-label="Billing period"
          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted p-1"
        >
          <PeriodToggle
            label="Monthly"
            value="MONTHLY"
            active={period === "MONTHLY"}
            onClick={() => setPeriod("MONTHLY")}
          />
          <PeriodToggle
            label={
              <span className="inline-flex items-center gap-2">
                Annual
                <Badge variant="secondary" className="bg-brand/10 text-brand">
                  Save 20%
                </Badge>
              </span>
            }
            value="ANNUAL"
            active={period === "ANNUAL"}
            onClick={() => setPeriod("ANNUAL")}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {SELF_SERVE_PLANS.map((plan) => {
          const isRecommended = recommendedPlan === plan.id;
          const isPopular = !!plan.isMostPopular;
          const price =
            period === "ANNUAL" ? plan.annualPriceCents : plan.monthlyPriceCents;

          return (
            // Card has `overflow-hidden` built in, so the "Most popular" badge
            // has to render on a sibling wrapper (not inside the card) to poke
            // out above the top border.
            <div key={plan.id} className="relative flex">
              {isPopular && (
                <div className="pointer-events-none absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                  <Badge className="bg-brand text-brand-foreground shadow-sm">
                    Most popular
                  </Badge>
                </div>
              )}
              <Card
                className={cn(
                  "flex w-full flex-col",
                  isPopular && "ring-2 ring-brand"
                )}
              >
              <CardContent className="flex flex-1 flex-col gap-5 p-6">
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-foreground">
                    {plan.name}
                  </div>
                  {isRecommended && (
                    <div className="text-xs font-medium text-brand">
                      Recommended for your team size
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight">
                      {formatPrice(price)}
                    </span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {period === "ANNUAL"
                      ? `Billed annually (${formatPrice(price * 12)}/yr)`
                      : "Billed monthly"}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  {plan.tagline} · {plan.employeeRange}
                </p>

                <div className="h-px bg-border" />

                <ul className="flex-1 space-y-2 text-sm">
                  {plan.features.map((feature) => {
                    const { label, comingSoon } = normalizeFeature(feature);
                    return (
                      <li
                        key={label}
                        className={cn(
                          "flex items-start gap-2",
                          comingSoon && "text-muted-foreground/70"
                        )}
                      >
                        <Check
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            comingSoon ? "text-muted-foreground/50" : "text-brand"
                          )}
                          aria-hidden="true"
                        />
                        <span>
                          {label}
                          {comingSoon && (
                            <span className="sr-only"> (coming soon)</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <Button
                  className={cn(
                    "w-full",
                    isPopular &&
                      "bg-brand text-brand-foreground hover:bg-brand-hover active:bg-brand-active"
                  )}
                  variant={isPopular ? "default" : "outline"}
                  onClick={() => handleSelect(plan.id)}
                  disabled={submittingPlan !== null}
                >
                  {submittingPlan === plan.id ? "Saving..." : "Start free trial"}
                </Button>
              </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {ENTERPRISE_PLAN && (
        <Card className="bg-muted/40">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4 sm:items-center">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"
                aria-hidden="true"
              >
                <Building2 className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-semibold">
                  {ENTERPRISE_PLAN.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {ENTERPRISE_PLAN.tagline} · starts{" "}
                  {formatPrice(ENTERPRISE_PLAN.monthlyPriceCents)}/mo
                </div>
              </div>
            </div>
            <Button variant="outline" asChild>
              <a
                href={`mailto:${ENTERPRISE_SALES_EMAIL}?subject=${encodeURIComponent(
                  "Enterprise plan inquiry"
                )}`}
              >
                Talk to us →
              </a>
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="text-center text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function PeriodToggle({
  label,
  value,
  active,
  onClick,
}: {
  label: React.ReactNode;
  value: BillingPeriod;
  active: boolean;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      data-value={value}
      className={cn(
        "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}
