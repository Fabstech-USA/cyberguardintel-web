import { describe, expect, it } from "vitest";
import { z } from "zod";

const CreateOrgSchema = z.object({
  name: z.string().min(2).max(100),
  industry: z.enum(["HEALTHCARE", "TECHNOLOGY", "FINANCE", "ECOMMERCE", "OTHER"]),
  employeeCount: z.number().int().positive().optional(),
  hipaaSubjectType: z
    .enum(["covered_entity", "business_associate", "both"])
    .optional(),
  billingEmail: z.string().email(),
});

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

describe("CreateOrgSchema validation", () => {
  const validPayload = {
    name: "Acme Health",
    industry: "HEALTHCARE",
    employeeCount: 50,
    hipaaSubjectType: "covered_entity",
    billingEmail: "billing@acme.com",
  };

  it("accepts a valid complete payload", () => {
    const result = CreateOrgSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("accepts payload without optional fields", () => {
    const result = CreateOrgSchema.safeParse({
      name: "Minimal Org",
      industry: "TECHNOLOGY",
      billingEmail: "admin@min.co",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = CreateOrgSchema.safeParse({ ...validPayload, name: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 characters", () => {
    const result = CreateOrgSchema.safeParse({
      ...validPayload,
      name: "x".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid industry", () => {
    const result = CreateOrgSchema.safeParse({
      ...validPayload,
      industry: "RETAIL",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-positive employee count", () => {
    const result = CreateOrgSchema.safeParse({
      ...validPayload,
      employeeCount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects fractional employee count", () => {
    const result = CreateOrgSchema.safeParse({
      ...validPayload,
      employeeCount: 3.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid HIPAA subject type", () => {
    const result = CreateOrgSchema.safeParse({
      ...validPayload,
      hipaaSubjectType: "hybrid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = CreateOrgSchema.safeParse({
      ...validPayload,
      billingEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = CreateOrgSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("slug generation", () => {
  it("lowercases and hyphenates a normal name", () => {
    expect(toSlug("Acme Health Systems")).toBe("acme-health-systems");
  });

  it("strips special characters", () => {
    expect(toSlug("O'Brien & Associates!")).toBe("o-brien-associates");
  });

  it("trims leading and trailing hyphens", () => {
    expect(toSlug("  --Hello World--  ")).toBe("hello-world");
  });

  it("collapses consecutive non-alphanumeric characters", () => {
    expect(toSlug("a   b---c")).toBe("a-b-c");
  });

  it("handles single word", () => {
    expect(toSlug("Fabstech")).toBe("fabstech");
  });
});
