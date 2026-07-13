import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { buildPriceToPlanMap, mapPriceIdToPlan } from "@/lib/stripe-plans";

describe("mapPriceIdToPlan", () => {
  const env = {
    STRIPE_STARTER_MONTHLY_PRICE_ID: "price_starter_monthly",
    STRIPE_STARTER_ANNUAL_PRICE_ID: "price_starter_annual",
    STRIPE_GROWTH_MONTHLY_PRICE_ID: "price_growth_monthly",
    STRIPE_GROWTH_ANNUAL_PRICE_ID: "price_growth_annual",
    STRIPE_BUSINESS_MONTHLY_PRICE_ID: "price_business_monthly",
    STRIPE_BUSINESS_ANNUAL_PRICE_ID: "price_business_annual",
  };

  it("maps monthly and annual price IDs to plan and period", () => {
    expect(mapPriceIdToPlan("price_starter_monthly", env)).toEqual({
      plan: "STARTER",
      period: "MONTHLY",
    });
    expect(mapPriceIdToPlan("price_growth_annual", env)).toEqual({
      plan: "GROWTH",
      period: "ANNUAL",
    });
    expect(mapPriceIdToPlan("price_business_monthly", env)).toEqual({
      plan: "BUSINESS",
      period: "MONTHLY",
    });
  });

  it("returns null for unknown price IDs", () => {
    expect(mapPriceIdToPlan("price_unknown", env)).toBeNull();
  });

  it("omits placeholder price_... values from the map", () => {
    const map = buildPriceToPlanMap({
      STRIPE_STARTER_MONTHLY_PRICE_ID: "price_...",
      STRIPE_GROWTH_MONTHLY_PRICE_ID: "price_real",
    });
    expect(map.has("price_...")).toBe(false);
    expect(map.get("price_real")).toEqual({
      plan: "GROWTH",
      period: "MONTHLY",
    });
  });
});

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    process.env.STRIPE_SECRET_KEY = "sk_test_fake";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("rejects forged payloads with invalid signature (400)", async () => {
    const constructEvent = vi.fn(() => {
      throw new Error("Invalid signature");
    });

    vi.doMock("@/lib/stripe", () => ({
      getStripe: () => ({
        webhooks: { constructEvent },
      }),
      clearOrganizationSubscription: vi.fn(),
      syncOrganizationFromSubscription: vi.fn(),
    }));

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "t=1,v1=forged" },
        body: JSON.stringify({ type: "customer.subscription.created" }),
      })
    );

    expect(res.status).toBe(400);
    expect(await res.text()).toBe("Invalid signature");
    expect(constructEvent).toHaveBeenCalled();
  });

  it("returns 400 when stripe-signature header is missing", async () => {
    vi.doMock("@/lib/stripe", () => ({
      getStripe: () => ({
        webhooks: { constructEvent: vi.fn() },
      }),
      clearOrganizationSubscription: vi.fn(),
      syncOrganizationFromSubscription: vi.fn(),
    }));

    const { POST } = await import("./route");
    const res = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
      })
    );
    expect(res.status).toBe(400);
  });
});
