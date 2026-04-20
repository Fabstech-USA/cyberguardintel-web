import { describe, expect, it } from "vitest";
import { z } from "zod";

// Mirror the schema exported from route.ts. Duplicating the definition here
// (rather than importing) keeps the test independent of Next route loaders,
// matching the pattern used by sibling onboarding route tests.
const HipaaRoleSchema = z.object({
  hipaaSubjectType: z.enum(["covered_entity", "business_associate", "both"]),
});

describe("HipaaRoleSchema validation", () => {
  it("accepts covered_entity", () => {
    const result = HipaaRoleSchema.safeParse({
      hipaaSubjectType: "covered_entity",
    });
    expect(result.success).toBe(true);
  });

  it("accepts business_associate", () => {
    const result = HipaaRoleSchema.safeParse({
      hipaaSubjectType: "business_associate",
    });
    expect(result.success).toBe(true);
  });

  it("accepts both", () => {
    const result = HipaaRoleSchema.safeParse({ hipaaSubjectType: "both" });
    expect(result.success).toBe(true);
  });

  it("rejects unknown values", () => {
    const result = HipaaRoleSchema.safeParse({ hipaaSubjectType: "unknown" });
    expect(result.success).toBe(false);
  });

  it("rejects missing field", () => {
    const result = HipaaRoleSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
