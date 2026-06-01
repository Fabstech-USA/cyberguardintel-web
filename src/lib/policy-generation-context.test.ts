import { describe, expect, it } from "vitest";
import { Industry } from "@/generated/prisma";
import {
  formValuesToContextOverrides,
  mergePolicyGenerationContext,
  snapshotToPolicyGenerateForm,
} from "@/lib/policy-generation-context";

describe("policy-generation-context", () => {
  const snapshot = {
    org_name: "Sunrise Clinic",
    industry: "Healthcare",
    employee_count: 42,
    entity_type: "Covered Entity",
    tech_stack: ["AWS", "Epic"],
    phi_systems: "Epic EHR",
    existing_controls: "MFA enabled",
  };

  it("prefills form state from org snapshot", () => {
    const form = snapshotToPolicyGenerateForm(snapshot, "covered_entity");
    expect(form.org_name).toBe("Sunrise Clinic");
    expect(form.industry).toBe(Industry.HEALTHCARE);
    expect(form.tech_stack).toBe("AWS, Epic");
  });

  it("merges optional overrides into AI payload fields", () => {
    const merged = mergePolicyGenerationContext(snapshot, {
      generation_notes: "Emphasize remote access controls.",
      has_mfa: true,
      provider_category: "Primary care",
    });

    expect(merged.generation_notes).toBe("Emphasize remote access controls.");
    expect(merged.has_mfa).toBe(true);
    expect(merged.provider_category).toBe("Primary care");
    expect(merged.org_name).toBe("Sunrise Clinic");
  });

  it("converts form values to context overrides", () => {
    const form = snapshotToPolicyGenerateForm(snapshot, "business_associate");
    const overrides = formValuesToContextOverrides({
      ...form,
      generation_notes: "Include BA workforce training.",
      has_mfa: "yes",
      has_recent_sra: "no",
    });

    expect(overrides.entity_type).toBe("Business Associate");
    expect(overrides.generation_notes).toBe("Include BA workforce training.");
    expect(overrides.has_mfa).toBe(true);
    expect(overrides.has_recent_sra).toBe(false);
    expect(overrides.has_named_security_officer).toBeUndefined();
  });
});
