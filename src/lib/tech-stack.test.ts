import { describe, expect, it } from "vitest";

import {
  DEMO_AWS_ID,
  DEMO_GOOGLE_WORKSPACE_ID,
} from "@/lib/demo-integrations";
import {
  formatTechStackLabel,
  integrationTypeToTechStackSlug,
  onboardingPhiSlugToTechStackSlug,
  phiSystemToTechStackSlug,
} from "@/lib/tech-stack";

describe("tech-stack", () => {
  it("maps live and demo integration types to stack slugs", () => {
    expect(integrationTypeToTechStackSlug("aws")).toBe("aws");
    expect(integrationTypeToTechStackSlug(DEMO_AWS_ID)).toBe("aws");
    expect(integrationTypeToTechStackSlug("google-workspace")).toBe(
      "google_workspace"
    );
    expect(integrationTypeToTechStackSlug(DEMO_GOOGLE_WORKSPACE_ID)).toBe(
      "google_workspace"
    );
    expect(integrationTypeToTechStackSlug("microsoft-365")).toBe(
      "microsoft_365"
    );
    expect(integrationTypeToTechStackSlug("1password")).toBe("1password");
    expect(integrationTypeToTechStackSlug("zoom")).toBe("zoom");
  });

  it("returns null for empty or bare demo prefixes without a map", () => {
    expect(integrationTypeToTechStackSlug("")).toBeNull();
    expect(integrationTypeToTechStackSlug("demo-unknown")).toBeNull();
  });

  it("maps onboarding PHI presets to stack slugs", () => {
    expect(onboardingPhiSlugToTechStackSlug("epic_ehr")).toBe("epic");
    expect(onboardingPhiSlugToTechStackSlug("athenahealth")).toBe("athena");
    expect(onboardingPhiSlugToTechStackSlug("drchrono")).toBe("drchrono");
    expect(onboardingPhiSlugToTechStackSlug("aws_rds_s3")).toBe("aws");
    expect(onboardingPhiSlugToTechStackSlug("azure")).toBe("azure");
    expect(onboardingPhiSlugToTechStackSlug("twilio_sms")).toBe("twilio");
    expect(onboardingPhiSlugToTechStackSlug("zoom_healthcare")).toBe("zoom");
    expect(onboardingPhiSlugToTechStackSlug("other")).toBeNull();
  });

  it("maps recognizable PHI system names to stack slugs", () => {
    expect(phiSystemToTechStackSlug({ name: "Epic EHR" })).toBe("epic");
    expect(phiSystemToTechStackSlug({ name: "AWS (RDS, S3)" })).toBe("aws");
    expect(phiSystemToTechStackSlug({ name: "Zoom for Healthcare" })).toBe(
      "zoom"
    );
    expect(phiSystemToTechStackSlug({ name: "Custom billing portal" })).toBeNull();
    expect(phiSystemToTechStackSlug({ name: "Other" })).toBeNull();
    expect(phiSystemToTechStackSlug({ name: "" })).toBeNull();
  });

  it("formats labels for presets and extras", () => {
    expect(formatTechStackLabel("google_workspace")).toBe("Google Workspace");
    expect(formatTechStackLabel("microsoft_365")).toBe("Microsoft 365");
    expect(formatTechStackLabel("1password")).toBe("1Password");
    expect(formatTechStackLabel("epic")).toBe("Epic EHR");
    expect(formatTechStackLabel("athena")).toBe("Athenahealth");
    expect(formatTechStackLabel("custom_tool")).toBe("Custom Tool");
  });
});
