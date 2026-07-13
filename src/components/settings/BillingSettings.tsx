"use client";

import { Check } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { BillingPeriod, PlanType } from "@/generated/prisma";
import { formatFrameworkLimit } from "@/lib/framework-limits";
import { formatIntegrationLimit } from "@/lib/integration-limits";
import { formatPlanLabel, isTrialActive } from "@/lib/plan-display";
import {
  ENTERPRISE_SALES_EMAIL,
  PLANS,
  type Plan,
  type PlanFeature,
  type PlanId,
} from "@/lib/plans";
import { cn } from "@/lib/utils";

type BillingSummary = {
  plan: PlanType;
  planPeriod: BillingPeriod;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  hasSubscription: boolean;
  integrationsUsed: number;
  integrationsLimit: number;
  frameworksUsed: number;
  frameworksLimit: number;
};

type InvoiceRow = {
  id: string;
  number: string | null;
  status: string | null;
  amountDue: number;
  amountPaid: number;
  currency: string;
  created: number;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
};

const SELF_SERVE_PLANS = PLANS.filter((p) => !p.isContactSales);
const ENTERPRISE_PLAN = PLANS.find((p) => p.isContactSales);

function formatMoney(amountCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatInvoiceDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPrice(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

function featureLabel(feature: PlanFeature): { label: string; comingSoon: boolean } {
  return typeof feature === "string"
    ? { label: feature, comingSoon: false }
    : { label: feature.label, comingSoon: !!feature.comingSoon };
}

function UsageMeter({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const finite = Number.isFinite(limit);
  const percent = finite ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const limitLabel = label.toLowerCase().includes("integration")
    ? formatIntegrationLimit(limit)
    : formatFrameworkLimit(limit);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {used} of {limitLabel}
        </span>
      </div>
      {finite ? (
        <Progress
          value={percent}
          className="h-1.5"
          indicatorClassName="bg-emerald-500"
        />
      ) : (
        <p className="text-xs text-muted-foreground">Unlimited on your plan</p>
      )}
    </div>
  );
}

export function BillingSettings() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [period, setPeriod] = useState<BillingPeriod>("MONTHLY");
  const [changingPlan, setChangingPlan] = useState<PlanId | null>(null);
  const [planMessage, setPlanMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, invoicesRes] = await Promise.all([
        fetch("/api/billing/summary"),
        fetch("/api/billing/invoices"),
      ]);

      if (!summaryRes.ok) {
        const payload = (await summaryRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Failed to load billing summary");
      }
      if (!invoicesRes.ok) {
        const payload = (await invoicesRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Failed to load invoices");
      }

      const summaryJson = (await summaryRes.json()) as BillingSummary;
      const invoicesJson = (await invoicesRes.json()) as {
        invoices: InvoiceRow[];
      };
      setSummary(summaryJson);
      setPeriod(summaryJson.planPeriod);
      setInvoices(invoicesJson.invoices ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      setPlanMessage("Subscription updated. Your plan may take a moment to refresh.");
      void load();
      window.history.replaceState({}, "", "/settings/billing");
    } else if (params.get("checkout") === "canceled") {
      setPlanMessage("Checkout canceled. Your plan was not changed.");
      window.history.replaceState({}, "", "/settings/billing");
    }
  }, [load]);

  async function openPortal() {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const payload = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !payload.url) {
        throw new Error(payload.error ?? "Failed to open billing portal");
      }
      window.location.href = payload.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open portal");
      setPortalLoading(false);
    }
  }

  async function changePlan(plan: PlanId) {
    if (plan === "ENTERPRISE") return;
    setChangingPlan(plan);
    setError(null);
    setPlanMessage(null);
    try {
      const res = await fetch("/api/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, period }),
      });
      const payload = (await res.json()) as {
        ok?: boolean;
        mode?: "updated" | "checkout";
        url?: string;
        unchanged?: boolean;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(payload.error ?? "Failed to change plan");
      }
      if (payload.mode === "checkout" && payload.url) {
        window.location.href = payload.url;
        return;
      }
      if (payload.unchanged) {
        setPlanMessage("You are already on this plan.");
      } else {
        setPlanMessage(`Switched to ${formatPlanLabel(plan)}.`);
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change plan");
    } finally {
      setChangingPlan(null);
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">Loading billing…</p>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="p-6">
        <p className="text-sm text-destructive">{error ?? "Unable to load billing"}</p>
        <Button className="mt-3" variant="outline" size="sm" onClick={() => void load()}>
          Retry
        </Button>
      </Card>
    );
  }

  const trial = isTrialActive(
    summary.trialEndsAt ? new Date(summary.trialEndsAt) : null
  );
  const periodLabel =
    summary.planPeriod === "ANNUAL" ? "Billed annually" : "Billed monthly";

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {planMessage ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
          {planMessage}
        </p>
      ) : null}

      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Current plan</h2>
            <p className="text-2xl font-semibold tracking-tight">
              {formatPlanLabel(summary.plan)}
              {trial ? (
                <span className="ml-2 text-sm font-medium text-muted-foreground">
                  Trial
                </span>
              ) : null}
            </p>
            <p className="text-sm text-muted-foreground">{periodLabel}</p>
          </div>
          <div className="flex flex-col items-stretch gap-1 sm:items-end">
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-600/90"
              onClick={() => void openPortal()}
              disabled={portalLoading}
            >
              {portalLoading ? "Opening…" : "Manage billing"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Portal link expires in 5 minutes
            </p>
          </div>
        </div>
      </Card>

      <Card className="space-y-5 p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Change plan</h2>
          <p className="text-sm text-muted-foreground">
            {summary.hasSubscription
              ? "Switch plans anytime. Changes are prorated on your next invoice."
              : "Start a paid subscription for the plan you want."}
          </p>
        </div>

        <div className="flex justify-start">
          <div
            role="tablist"
            aria-label="Billing period"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={period === "MONTHLY"}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-colors",
                period === "MONTHLY"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setPeriod("MONTHLY")}
            >
              Monthly
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={period === "ANNUAL"}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm transition-colors",
                period === "ANNUAL"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setPeriod("ANNUAL")}
            >
              Annual
              <Badge variant="secondary" className="ml-2">
                Save 20%
              </Badge>
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {SELF_SERVE_PLANS.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              period={period}
              isCurrent={
                summary.plan === plan.id && summary.planPeriod === period
              }
              busy={changingPlan === plan.id}
              disabled={changingPlan !== null}
              hasSubscription={summary.hasSubscription}
              onSelect={() => void changePlan(plan.id)}
            />
          ))}
        </div>

        {ENTERPRISE_PLAN ? (
          <div className="flex flex-col gap-2 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{ENTERPRISE_PLAN.name}</p>
              <p className="text-sm text-muted-foreground">
                {ENTERPRISE_PLAN.tagline}
              </p>
            </div>
            <Button variant="outline" asChild>
              <a
                href={`mailto:${ENTERPRISE_SALES_EMAIL}?subject=${encodeURIComponent("Enterprise plan inquiry")}`}
              >
                Talk to sales
              </a>
            </Button>
          </div>
        ) : null}
      </Card>

      <Card className="space-y-5 p-6">
        <h2 className="text-lg font-semibold">Usage</h2>
        <UsageMeter
          label="Integrations"
          used={summary.integrationsUsed}
          limit={summary.integrationsLimit}
        />
        <UsageMeter
          label="Frameworks"
          used={summary.frameworksUsed}
          limit={summary.frameworksLimit}
        />
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold">Invoices</h2>
        {invoices.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No invoices yet. They will appear here after your first payment.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Date</th>
                  <th className="pb-2 pr-3 font-medium">Number</th>
                  <th className="pb-2 pr-3 font-medium">Status</th>
                  <th className="pb-2 pr-3 font-medium">Amount</th>
                  <th className="pb-2 font-medium"> </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b last:border-0">
                    <td className="py-2.5 pr-3">
                      {formatInvoiceDate(invoice.created)}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {invoice.number ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3 capitalize">
                      {invoice.status ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums">
                      {formatMoney(
                        invoice.status === "paid"
                          ? invoice.amountPaid
                          : invoice.amountDue,
                        invoice.currency
                      )}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-2">
                        {invoice.hostedInvoiceUrl ? (
                          <a
                            href={invoice.hostedInvoiceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            View
                          </a>
                        ) : null}
                        {invoice.invoicePdf ? (
                          <a
                            href={invoice.invoicePdf}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline-offset-2 hover:underline"
                          >
                            Download
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function PlanCard({
  plan,
  period,
  isCurrent,
  busy,
  disabled,
  hasSubscription,
  onSelect,
}: {
  plan: Plan;
  period: BillingPeriod;
  isCurrent: boolean;
  busy: boolean;
  disabled: boolean;
  hasSubscription: boolean;
  onSelect: () => void;
}) {
  const price =
    period === "ANNUAL" ? plan.annualPriceCents : plan.monthlyPriceCents;

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border p-4",
        isCurrent && "border-emerald-600 ring-1 ring-emerald-600/30"
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{plan.name}</p>
          <p className="text-xs text-muted-foreground">{plan.tagline}</p>
        </div>
        {isCurrent ? <Badge variant="secondary">Current</Badge> : null}
      </div>
      <p className="mb-3 text-2xl font-semibold tracking-tight">
        {formatPrice(price)}
        <span className="text-sm font-normal text-muted-foreground">/mo</span>
      </p>
      <ul className="mb-4 flex-1 space-y-1.5 text-sm">
        {plan.features.slice(0, 4).map((feature) => {
          const { label, comingSoon } = featureLabel(feature);
          return (
            <li
              key={label}
              className={cn(
                "flex items-start gap-2",
                comingSoon && "text-muted-foreground"
              )}
            >
              <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
              <span>
                {label}
                {comingSoon ? " (soon)" : null}
              </span>
            </li>
          );
        })}
      </ul>
      <Button
        variant={isCurrent ? "outline" : "default"}
        disabled={isCurrent || disabled}
        onClick={onSelect}
      >
        {busy
          ? "Updating…"
          : isCurrent
            ? "Current plan"
            : hasSubscription
              ? "Switch to this plan"
              : "Subscribe"}
      </Button>
    </div>
  );
}
