import { describe, expect, it } from "vitest";
import { z } from "zod";

const TechStackSchema = z.object({
  techStack: z.array(
    z.enum([
      "aws",
      "google_cloud",
      "azure",
      "google_workspace",
      "microsoft_365",
      "github",
      "okta",
      "slack",
    ])
  ),
});

describe("TechStackSchema validation", () => {
  it("accepts an empty array (no integrations selected)", () => {
    const result = TechStackSchema.safeParse({ techStack: [] });
    expect(result.success).toBe(true);
  });

  it("accepts a single valid value", () => {
    const result = TechStackSchema.safeParse({ techStack: ["aws"] });
    expect(result.success).toBe(true);
  });

  it("accepts all valid values", () => {
    const result = TechStackSchema.safeParse({
      techStack: [
        "aws",
        "google_cloud",
        "azure",
        "google_workspace",
        "microsoft_365",
        "github",
        "okta",
        "slack",
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown values", () => {
    const result = TechStackSchema.safeParse({
      techStack: ["aws", "digitalocean"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing techStack field", () => {
    const result = TechStackSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-array value", () => {
    const result = TechStackSchema.safeParse({ techStack: "aws" });
    expect(result.success).toBe(false);
  });
});
