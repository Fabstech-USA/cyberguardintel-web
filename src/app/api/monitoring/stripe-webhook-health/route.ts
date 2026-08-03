// Phase 11 safety net: Stripe's only built-in webhook-failure alert is an
// automatic email sent after ~3 days of continuous delivery failure, right
// before it auto-disables the endpoint (see docs.stripe.com/webhooks#event-delivery-behaviors).
// That's too slow for a live-mode payment/subscription endpoint. This route
// gets polled every 15 minutes by .github/workflows/stripe-webhook-health-check.yml
// (Vercel Hobby's cron scheduler only runs jobs once a day, so GitHub Actions —
// already used for CI in this repo — does the frequent polling instead) and
// emails jose.fabian.dev@gmail.com (OPS_ALERT_EMAIL) as soon as deliveries start
// failing, instead of waiting out Stripe's 3-day window.
import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/email";
import { getStripe } from "@/lib/stripe";

// Give Stripe's exponential-backoff retries a chance to succeed on transient
// blips before we treat a pending/failed delivery as an incident worth paging.
const RETRY_GRACE_PERIOD_SECONDS = 30 * 60;

// How far back each run looks. With a 15-minute poll interval this window is
// intentionally generous: a sustained outage keeps re-triggering the alert on
// every run (by design — better a repeated email than one alert you miss)
// until deliveries succeed again, rather than firing once and going quiet.
const LOOKBACK_SECONDS = 6 * 60 * 60;

function getOpsAlertEmail(): string {
  const email = process.env.OPS_ALERT_EMAIL;
  if (!email) {
    throw new Error("OPS_ALERT_EMAIL is not set");
  }
  return email;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: Request): Promise<Response> {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  const now = Math.floor(Date.now() / 1000);

  const events = await stripe.events.list({
    delivery_success: false,
    created: { gte: now - LOOKBACK_SECONDS },
    limit: 100,
  });

  const failing = events.data.filter(
    (event) => now - event.created > RETRY_GRACE_PERIOD_SECONDS
  );

  if (failing.length > 0) {
    const plural = failing.length === 1 ? "" : "s";
    const rows = failing
      .map((event) => {
        const ageMinutes = Math.round((now - event.created) / 60);
        return `<li><strong>${escapeHtml(event.type)}</strong> (${escapeHtml(
          event.id
        )}) — created ${ageMinutes} min ago, pending_webhooks=${event.pending_webhooks}</li>`;
      })
      .join("");

    await sendEmail({
      to: getOpsAlertEmail(),
      subject: `Stripe webhook delivery failing (${failing.length} event${plural})`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>Stripe webhook delivery is failing</h2>
          <p>The <code>cyberguardintel-production</code> webhook endpoint hasn't
          successfully delivered ${failing.length} event${plural} for more than
          30 minutes. Stripe itself only alerts after ~3 days of continuous
          failure (right before auto-disabling the endpoint) — this check runs
          every 15 minutes so you hear about it sooner.</p>
          <ul>${rows}</ul>
          <p>Check Stripe Workbench → Webhooks → cyberguardintel-production →
          Event deliveries for details, and Vercel → cyberguardintel-web → Logs
          for the corresponding request errors.</p>
        </div>
      `,
    });
  }

  return NextResponse.json({
    ok: true,
    checked: events.data.length,
    failing: failing.length,
  });
}
