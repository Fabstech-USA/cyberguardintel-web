import { describe, expect, it } from "vitest";

import {
  formatFrameworkLimit,
  FrameworkLimitError,
  getFrameworkLimit,
} from "@/lib/framework-limits";

describe("framework limits", () => {
  it("returns plan-specific limits", () => {
    expect(getFrameworkLimit("STARTER")).toBe(1);
    expect(getFrameworkLimit("GROWTH")).toBe(1);
    expect(getFrameworkLimit("BUSINESS")).toBe(Number.POSITIVE_INFINITY);
    expect(getFrameworkLimit("ENTERPRISE")).toBe(Number.POSITIVE_INFINITY);
  });

  it("formats finite and unlimited limits", () => {
    expect(formatFrameworkLimit(1)).toBe("1");
    expect(formatFrameworkLimit(Number.POSITIVE_INFINITY)).toBe("Unlimited");
  });

  it("creates framework limit errors with metadata", () => {
    const error = new FrameworkLimitError(1, 1, "STARTER");
    expect(error.code).toBe("framework_limit_reached");
    expect(error.used).toBe(1);
    expect(error.limit).toBe(1);
    expect(error.plan).toBe("STARTER");
  });
});
