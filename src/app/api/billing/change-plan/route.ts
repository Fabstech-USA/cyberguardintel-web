import { NextResponse } from "next/server";
import { z } from "zod";

import type { OrgRole } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  getOrCreateCustomer,
  getStripe,
  syncOrganizationFromSubscription,
} from "@/lib/stripe";
import { getPriceIdForPlan, isSelfServePlan } from "@/lib/stripe-plans";
import { withTenant } from "@/lib/tenant";

const ChangePlanSchema = z.object({
  plan: z.enum(["STARTER", "GROWTH", "BUSINESS"]),
  period: z.enum(["MONTHLY", "ANNUAL"]),
});

function isOrgAdmin(role: string): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export const POST = withTenant(async (req, ctx) => {
  if (!isOrgAdmin(ctx.orgRole as OrgRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_APP_URL is not configured" },
      { status: 500 }
    );
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = ChangePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { plan, period } = parsed.data;
  if (!isSelfServePlan(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const priceId = getPriceIdForPlan(plan, period);
  if (!priceId) {
    return NextResponse.json(
      {
        error:
          "Stripe price is not configured for this plan. Set the Price ID in env.",
      },
      { status: 500 }
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      id: true,
      plan: true,
      planPeriod: true,
      stripeSubId: true,
      billingEmail: true,
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (org.plan === plan && org.planPeriod === period && org.stripeSubId) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const customerId = await getOrCreateCustomer(ctx.organizationId);
  const stripe = getStripe();
  const returnBase = appUrl.replace(/\/$/, "");

  // Existing subscription → switch price with proration; webhook keeps DB in sync.
  if (org.stripeSubId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(org.stripeSubId);
      const itemId = subscription.items.data[0]?.id;
      if (!itemId) {
        return NextResponse.json(
          { error: "Subscription has no line items" },
          { status: 500 }
        );
      }

      const updated = await stripe.subscriptions.update(org.stripeSubId, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: "create_prorations",
        metadata: {
          organizationId: org.id,
          plan,
          period,
        },
      });

      await syncOrganizationFromSubscription(updated);

      return NextResponse.json({
        ok: true,
        mode: "updated",
        plan,
        period,
      });
    } catch (err) {
      console.error("Failed to change Stripe subscription plan:", err);
      return NextResponse.json(
        { error: "Failed to change subscription plan" },
        { status: 500 }
      );
    }
  }

  // No subscription yet (e.g. trial) → Checkout to start paying for this plan.
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: org.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${returnBase}/settings/billing?checkout=success`,
      cancel_url: `${returnBase}/settings/billing?checkout=canceled`,
      metadata: {
        organizationId: org.id,
        plan,
        period,
      },
      subscription_data: {
        metadata: {
          organizationId: org.id,
          plan,
          period,
        },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Checkout session missing URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      mode: "checkout",
      url: session.url,
    });
  } catch (err) {
    console.error("Failed to create Checkout session:", err);
    return NextResponse.json(
      { error: "Failed to start checkout" },
      { status: 500 }
    );
  }
});
