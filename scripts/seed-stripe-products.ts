/**
 * Idempotent seed for Starter / Growth / Business Stripe products and prices.
 *
 * Usage: npm run stripe:seed
 * Requires STRIPE_SECRET_KEY (sk_test_... / sk_live_...) in .env.local
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import Stripe from "stripe";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../.env.local") });

type SelfServePlan = {
  id: "STARTER" | "GROWTH" | "BUSINESS";
  name: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
};

/** Mirrors src/lib/plans.ts self-serve catalog (Enterprise is contact-sales). */
const SELF_SERVE_PLANS: readonly SelfServePlan[] = [
  {
    id: "STARTER",
    name: "Starter",
    monthlyPriceCents: 14_900,
    annualPriceCents: 11_900,
  },
  {
    id: "GROWTH",
    name: "Growth",
    monthlyPriceCents: 34_900,
    annualPriceCents: 27_900,
  },
  {
    id: "BUSINESS",
    name: "Business",
    monthlyPriceCents: 64_900,
    annualPriceCents: 51_900,
  },
];

const ENV_KEYS = {
  STARTER: {
    MONTHLY: "STRIPE_STARTER_MONTHLY_PRICE_ID",
    ANNUAL: "STRIPE_STARTER_ANNUAL_PRICE_ID",
  },
  GROWTH: {
    MONTHLY: "STRIPE_GROWTH_MONTHLY_PRICE_ID",
    ANNUAL: "STRIPE_GROWTH_ANNUAL_PRICE_ID",
  },
  BUSINESS: {
    MONTHLY: "STRIPE_BUSINESS_MONTHLY_PRICE_ID",
    ANNUAL: "STRIPE_BUSINESS_ANNUAL_PRICE_ID",
  },
} as const;

async function findProductByPlan(
  stripe: Stripe,
  plan: string
): Promise<Stripe.Product | null> {
  const products = await stripe.products.list({ limit: 100, active: true });
  return (
    products.data.find((p) => p.metadata?.plan === plan) ?? null
  );
}

async function findPrice(
  stripe: Stripe,
  productId: string,
  plan: string,
  period: "MONTHLY" | "ANNUAL",
  unitAmount: number,
  interval: "month" | "year"
): Promise<Stripe.Price | null> {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 100,
  });
  return (
    prices.data.find(
      (p) =>
        p.metadata?.plan === plan &&
        p.metadata?.period === period &&
        p.unit_amount === unitAmount &&
        p.recurring?.interval === interval &&
        p.currency === "usd"
    ) ?? null
  );
}

async function ensureProduct(
  stripe: Stripe,
  plan: SelfServePlan
): Promise<Stripe.Product> {
  const existing = await findProductByPlan(stripe, plan.id);
  if (existing) {
    console.log(`  Product ${plan.name}: reuse ${existing.id}`);
    return existing;
  }
  const created = await stripe.products.create({
    name: `CyberGuardIntel ${plan.name}`,
    description: `${plan.name} subscription`,
    metadata: { plan: plan.id },
  });
  console.log(`  Product ${plan.name}: created ${created.id}`);
  return created;
}

async function ensurePrice(
  stripe: Stripe,
  productId: string,
  plan: SelfServePlan,
  period: "MONTHLY" | "ANNUAL",
  unitAmount: number,
  interval: "month" | "year"
): Promise<Stripe.Price> {
  const existing = await findPrice(
    stripe,
    productId,
    plan.id,
    period,
    unitAmount,
    interval
  );
  if (existing) {
    console.log(`  Price ${plan.id} ${period}: reuse ${existing.id}`);
    return existing;
  }
  const created = await stripe.prices.create({
    product: productId,
    currency: "usd",
    unit_amount: unitAmount,
    recurring: { interval },
    metadata: { plan: plan.id, period },
  });
  console.log(`  Price ${plan.id} ${period}: created ${created.id}`);
  return created;
}

async function main() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    console.error("STRIPE_SECRET_KEY is not set in .env.local");
    process.exit(1);
  }
  if (!secret.startsWith("sk_")) {
    console.error(
      "STRIPE_SECRET_KEY must start with sk_test_ or sk_live_ (not pk_)."
    );
    process.exit(1);
  }

  const stripe = new Stripe(secret);
  const envLines: string[] = [];

  console.log("Seeding Stripe products and prices…\n");

  for (const plan of SELF_SERVE_PLANS) {
    console.log(`${plan.name}:`);
    const product = await ensureProduct(stripe, plan);
    const monthly = await ensurePrice(
      stripe,
      product.id,
      plan,
      "MONTHLY",
      plan.monthlyPriceCents,
      "month"
    );
    const annual = await ensurePrice(
      stripe,
      product.id,
      plan,
      "ANNUAL",
      plan.annualPriceCents * 12,
      "year"
    );

    const keys = ENV_KEYS[plan.id];
    envLines.push(`${keys.MONTHLY}=${monthly.id}`);
    envLines.push(`${keys.ANNUAL}=${annual.id}`);
    console.log("");
  }

  console.log("Paste into .env.local:\n");
  for (const line of envLines) {
    console.log(line);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
