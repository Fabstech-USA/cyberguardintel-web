import { describe, expect, it } from "vitest";
import { formatPolicyVersion } from "@/lib/hipaa-policy-version";

describe("formatPolicyVersion", () => {
  it("formats integer as vN", () => {
    expect(formatPolicyVersion(1)).toBe("v1");
    expect(formatPolicyVersion(12)).toBe("v12");
  });
});
