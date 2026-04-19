import { describe, expect, it } from "vitest";
import { z } from "zod";

const FrameworksSchema = z.object({
  frameworkSlugs: z
    .array(z.enum(["HIPAA", "SOC2", "PCI_DSS", "ISO27001", "CMMC"]))
    .min(1, "Select at least one framework"),
});

describe("FrameworksSchema validation", () => {
  it("accepts a single valid framework", () => {
    const result = FrameworksSchema.safeParse({ frameworkSlugs: ["HIPAA"] });
    expect(result.success).toBe(true);
  });

  it("accepts multiple valid frameworks", () => {
    const result = FrameworksSchema.safeParse({
      frameworkSlugs: ["HIPAA", "SOC2", "CMMC"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts all five frameworks", () => {
    const result = FrameworksSchema.safeParse({
      frameworkSlugs: ["HIPAA", "SOC2", "PCI_DSS", "ISO27001", "CMMC"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty array", () => {
    const result = FrameworksSchema.safeParse({ frameworkSlugs: [] });
    expect(result.success).toBe(false);
  });

  it("rejects unknown framework slugs", () => {
    const result = FrameworksSchema.safeParse({
      frameworkSlugs: ["HIPAA", "GDPR"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing frameworkSlugs field", () => {
    const result = FrameworksSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-array value", () => {
    const result = FrameworksSchema.safeParse({ frameworkSlugs: "HIPAA" });
    expect(result.success).toBe(false);
  });
});
