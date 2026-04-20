import { describe, expect, it } from "vitest";
import { PLANS, getPlan, recommendedPlanFor } from "./plans";

describe("recommendedPlanFor", () => {
  it("returns GROWTH when employeeCount is missing", () => {
    expect(recommendedPlanFor(null)).toBe("GROWTH");
    expect(recommendedPlanFor(undefined)).toBe("GROWTH");
  });

  it("returns GROWTH for zero or negative values", () => {
    expect(recommendedPlanFor(0)).toBe("GROWTH");
    expect(recommendedPlanFor(-5)).toBe("GROWTH");
  });

  it("returns STARTER for 1\u201315 employees", () => {
    expect(recommendedPlanFor(1)).toBe("STARTER");
    expect(recommendedPlanFor(10)).toBe("STARTER");
    expect(recommendedPlanFor(15)).toBe("STARTER");
  });

  it("returns GROWTH for 16\u2013100 employees", () => {
    expect(recommendedPlanFor(16)).toBe("GROWTH");
    expect(recommendedPlanFor(50)).toBe("GROWTH");
    expect(recommendedPlanFor(100)).toBe("GROWTH");
  });

  it("returns BUSINESS for 101\u2013300 employees", () => {
    expect(recommendedPlanFor(101)).toBe("BUSINESS");
    expect(recommendedPlanFor(200)).toBe("BUSINESS");
    expect(recommendedPlanFor(300)).toBe("BUSINESS");
  });

  it("returns ENTERPRISE for 301+ employees", () => {
    expect(recommendedPlanFor(301)).toBe("ENTERPRISE");
    expect(recommendedPlanFor(1_000)).toBe("ENTERPRISE");
    expect(recommendedPlanFor(10_000)).toBe("ENTERPRISE");
  });
});

describe("PLANS catalog", () => {
  it("has exactly one Most popular plan", () => {
    const popular = PLANS.filter((p) => p.isMostPopular);
    expect(popular).toHaveLength(1);
    expect(popular[0].id).toBe("GROWTH");
  });

  it("has exactly one contact-sales plan (Enterprise)", () => {
    const contactSales = PLANS.filter((p) => p.isContactSales);
    expect(contactSales).toHaveLength(1);
    expect(contactSales[0].id).toBe("ENTERPRISE");
  });

  it("annual price is always cheaper than monthly (when billed annually)", () => {
    for (const plan of PLANS) {
      expect(plan.annualPriceCents).toBeLessThan(plan.monthlyPriceCents);
    }
  });

  it("getPlan returns the matching plan", () => {
    expect(getPlan("STARTER").id).toBe("STARTER");
    expect(getPlan("GROWTH").id).toBe("GROWTH");
    expect(getPlan("BUSINESS").id).toBe("BUSINESS");
    expect(getPlan("ENTERPRISE").id).toBe("ENTERPRISE");
  });
});
