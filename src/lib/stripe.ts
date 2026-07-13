import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { mapPriceIdToPlan } from "@/lib/stripe-plans";

export {
  buildPriceToPlanMap,
  mapPriceIdToPlan,
  type PlanPeriodMapping,
} from "@/lib/stripe-plans";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeSingleton) return stripeSingleton;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  stripeSingleton = new Stripe(key);
  return stripeSingleton;
}

export function trialEndsAtFromSubscription(
  subscription: Stripe.Subscription
): Date | null {
  if (!subscription.trial_end) return null;
  return new Date(subscription.trial_end * 1000);
}

export function getSubscriptionPriceId(
  subscription: Stripe.Subscription
): string | null {
  const item = subscription.items.data[0];
  if (!item) return null;
  const price = item.price;
  return typeof price === "string" ? price : price.id;
}

export function getSubscriptionCustomerId(
  subscription: Stripe.Subscription
): string | null {
  const customer = subscription.customer;
  if (!customer) return null;
  return typeof customer === "string" ? customer : customer.id;
}

/**
 * Resolve the Organization row for a Stripe subscription.
 * Prefers stripeSubId, then stripeCustomerId, then metadata.organizationId.
 */
export async function findOrganizationForSubscription(
  subscription: Stripe.Subscription
) {
  const bySub = await prisma.organization.findUnique({
    where: { stripeSubId: subscription.id },
  });
  if (bySub) return bySub;

  const customerId = getSubscriptionCustomerId(subscription);
  if (customerId) {
    const byCustomer = await prisma.organization.findUnique({
      where: { stripeCustomerId: customerId },
    });
    if (byCustomer) return byCustomer;
  }

  const orgId = subscription.metadata?.organizationId;
  if (orgId) {
    return prisma.organization.findUnique({ where: { id: orgId } });
  }

  return null;
}

/**
 * Apply an active/trialing subscription to the matching Organization.
 * Throws if the price ID is not mapped in env (caller should return 500).
 */
export async function syncOrganizationFromSubscription(
  subscription: Stripe.Subscription
): Promise<void> {
  const priceId = getSubscriptionPriceId(subscription);
  if (!priceId) {
    throw new Error(`Subscription ${subscription.id} has no price item`);
  }

  const mapping = mapPriceIdToPlan(priceId);
  if (!mapping) {
    throw new Error(`Unknown Stripe price ID: ${priceId}`);
  }

  const org = await findOrganizationForSubscription(subscription);
  if (!org) {
    throw new Error(
      `No organization found for subscription ${subscription.id}`
    );
  }

  const customerId = getSubscriptionCustomerId(subscription);
  if (!customerId) {
    throw new Error(`Subscription ${subscription.id} has no customer`);
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      stripeCustomerId: customerId,
      stripeSubId: subscription.id,
      plan: mapping.plan,
      planPeriod: mapping.period,
      trialEndsAt: trialEndsAtFromSubscription(subscription),
    },
  });
}

/** Downgrade org when subscription is canceled/deleted. Keeps stripeCustomerId. */
export async function clearOrganizationSubscription(
  subscription: Stripe.Subscription
): Promise<void> {
  const org = await findOrganizationForSubscription(subscription);
  if (!org) {
    console.warn(
      `No organization found for deleted subscription ${subscription.id}`
    );
    return;
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      stripeSubId: null,
      plan: "STARTER",
      planPeriod: "MONTHLY",
      trialEndsAt: null,
    },
  });
}

export async function getOrCreateCustomer(
  organizationId: string
): Promise<string> {
  const stripe = getStripe();
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      billingEmail: true,
      stripeCustomerId: true,
    },
  });

  if (!org) {
    throw new Error(`Organization not found: ${organizationId}`);
  }

  if (org.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(org.stripeCustomerId);
      if (!existing.deleted) {
        return org.stripeCustomerId;
      }
    } catch {
      // Customer missing in Stripe — create a new one below.
    }
  }

  const customer = await stripe.customers.create({
    email: org.billingEmail || undefined,
    name: org.name,
    metadata: { organizationId: org.id },
  });

  await prisma.organization.update({
    where: { id: org.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}
