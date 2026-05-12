import { describe, expect, it } from "vitest";

import {
  AiBaaTemplateInputSchema,
  AiBaaTemplateOutputSchema,
} from "@/lib/ai-baa-template";

describe("AiBaaTemplateInputSchema", () => {
  it("accepts a valid template request", () => {
    const result = AiBaaTemplateInputSchema.safeParse({
      vendorName: "Twilio",
      vendorEmail: "contracts@twilio.com",
      services: "SMS appointment reminders for patients",
      organizationName: "Sunrise Clinic",
      hipaaEntityType: "Covered Entity",
      notes: "Include subcontractor obligations.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing vendor name", () => {
    const result = AiBaaTemplateInputSchema.safeParse({
      vendorName: "",
      services: "Messaging",
      organizationName: "Sunrise Clinic",
      hipaaEntityType: "Covered Entity",
    });
    expect(result.success).toBe(false);
  });
});

describe("AiBaaTemplateOutputSchema", () => {
  it("accepts a valid AI template response", () => {
    const result = AiBaaTemplateOutputSchema.safeParse({
      document_title: "Business Associate Agreement",
      summary: "Draft agreement covering HIPAA-required vendor obligations.",
      full_markdown: "# Business Associate Agreement\n\nThis agreement ...",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing full_markdown body", () => {
    const result = AiBaaTemplateOutputSchema.safeParse({
      document_title: "Business Associate Agreement",
      summary: "Draft agreement covering HIPAA-required vendor obligations.",
    });
    expect(result.success).toBe(false);
  });
});
