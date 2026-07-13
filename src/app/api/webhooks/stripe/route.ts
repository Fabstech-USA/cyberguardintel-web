// Webhooks authenticate via Stripe signature (not session). Do not use withTenant here.

import type Stripe from "stripe";
import {
  clearOrganizationSubscription,
  getStripe,
  syncOrganizationFromSubscription,
} from "@/lib/stripe";

const HANDLED_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

function isCanceledStatus(status: Stripe.Subscription.Status): boolean {
  return status === "canceled" || status === "unpaid" || status === "incomplete_expired";
}

export async function POST(req: Request): Promise<Response> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response("Server misconfiguration", { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    return Response.json({ received: true });
  }

  const subscription = event.data.object as Stripe.Subscription;

  try {
    if (event.type === "customer.subscription.deleted") {
      await clearOrganizationSubscription(subscription);
    } else if (isCanceledStatus(subscription.status)) {
      await clearOrganizationSubscription(subscription);
    } else {
      await syncOrganizationFromSubscription(subscription);
    }
  } catch (err) {
    console.error("Stripe webhook handler failed:", {
      type: event.type,
      subscriptionId: subscription.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return new Response("Handler error", { status: 500 });
  }

  return Response.json({ received: true });
}
