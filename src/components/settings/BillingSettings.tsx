"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { BillingPeriod, PlanType } from "@/generated/prisma";
import { formatFrameworkLimit } from "@/lib/framework-limits";
import { formatIntegrationLimit } from "@/lib/integration-limits";
import { formatPlanLabel, isTrialActive } from "@/lib/plan-display";

type BillingSummary = {
  plan: PlanType;
  planPeriod: BillingPeriod;
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
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
            <Button onClick={() => void openPortal()} disabled={portalLoading}>
              {portalLoading ? "Opening…" : "Manage billing"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Portal link expires in 5 minutes
            </p>
          </div>
        </div>
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
