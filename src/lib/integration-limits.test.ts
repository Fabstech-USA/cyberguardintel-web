import { describe, expect, it } from "vitest";

import {
  formatIntegrationLimit,
  getIntegrationLimit,
  IntegrationLimitError,
} from "@/lib/integration-limits";

describe("integration limits", () => {
  it("returns plan-specific limits", () => {
    expect(getIntegrationLimit("STARTER")).toBe(10);
    expect(getIntegrationLimit("GROWTH")).toBe(50);
    expect(getIntegrationLimit("BUSINESS")).toBe(100);
    expect(getIntegrationLimit("ENTERPRISE")).toBe(Number.POSITIVE_INFINITY);
  });

  it("formats finite and unlimited limits", () => {
    expect(formatIntegrationLimit(10)).toBe("10");
    expect(formatIntegrationLimit(Number.POSITIVE_INFINITY)).toBe("Unlimited");
  });

  it("creates integration limit errors with metadata", () => {
    const error = new IntegrationLimitError(10, 10, "STARTER");
    expect(error.code).toBe("integration_limit_reached");
    expect(error.used).toBe(10);
    expect(error.limit).toBe(10);
    expect(error.plan).toBe("STARTER");
  });
});
