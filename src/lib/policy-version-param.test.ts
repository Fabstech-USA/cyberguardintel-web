import { describe, expect, it } from "vitest";
import { parsePolicyVersionParam } from "@/lib/policy-version-param";

describe("parsePolicyVersionParam", () => {
  it("accepts positive integers", () => {
    expect(parsePolicyVersionParam("1")).toBe(1);
    expect(parsePolicyVersionParam("12")).toBe(12);
  });

  it("rejects invalid values", () => {
    expect(parsePolicyVersionParam("0")).toBeNull();
    expect(parsePolicyVersionParam("-1")).toBeNull();
    expect(parsePolicyVersionParam("abc")).toBeNull();
    expect(parsePolicyVersionParam("1.5")).toBeNull();
  });
});
