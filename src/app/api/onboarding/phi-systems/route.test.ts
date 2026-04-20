import { describe, expect, it } from "vitest";
import { z } from "zod";

const PhiSystemsSchema = z.object({
  systems: z
    .array(
      z.enum([
        "epic_ehr",
        "athenahealth",
        "drchrono",
        "aws_rds_s3",
        "azure",
        "twilio_sms",
        "zoom_healthcare",
        "other",
      ])
    )
    .min(1, "Select at least one PHI system"),
});

describe("PhiSystemsSchema validation", () => {
  it("accepts a single valid system", () => {
    const result = PhiSystemsSchema.safeParse({ systems: ["epic_ehr"] });
    expect(result.success).toBe(true);
  });

  it("accepts multiple valid systems", () => {
    const result = PhiSystemsSchema.safeParse({
      systems: ["epic_ehr", "aws_rds_s3", "twilio_sms"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty array", () => {
    const result = PhiSystemsSchema.safeParse({ systems: [] });
    expect(result.success).toBe(false);
  });

  it("rejects unknown system slugs", () => {
    const result = PhiSystemsSchema.safeParse({
      systems: ["epic_ehr", "salesforce"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing systems field", () => {
    const result = PhiSystemsSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
