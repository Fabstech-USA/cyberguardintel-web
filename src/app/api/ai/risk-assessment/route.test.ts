import { describe, expect, it } from "vitest";
import {
  AiRiskInputSchema,
  AiRiskOutputSchema,
} from "@/lib/ai-risk-assessment";

const validThreat = {
  threat_name: "Phishing",
  threat_source: "human",
  likelihood: "medium",
  impact: "high",
  overall_risk: "high",
  controls_affected: ["164.308(a)(5)"],
  current_controls: "Annual training",
  recommendation: "Quarterly phishing simulations",
};

const validOutput = {
  executive_summary: "Two-sentence plain-language summary of risk posture.",
  scope: "EHR and patient portal",
  threats: Array.from({ length: 5 }, () => validThreat),
  overall_risk_level: "medium",
  critical_gaps: ["No DLP", "Stale access reviews", "No vendor BAA tracking"],
  immediate_actions: ["a", "b", "c", "d", "e"],
  long_term_actions: ["a", "b", "c", "d", "e"],
};

describe("AiRiskInputSchema", () => {
  it("accepts the six string inputs the FastAPI service expects", () => {
    const result = AiRiskInputSchema.safeParse({
      industry: "Healthcare",
      employee_count: 50,
      entity_type: "Covered Entity",
      phi_systems: "EHR, patient portal",
      tech_stack: "AWS, Okta",
      existing_controls: "MFA, encrypted backups",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative employee_count", () => {
    const result = AiRiskInputSchema.safeParse({
      industry: "Healthcare",
      employee_count: -1,
      entity_type: "Covered Entity",
      phi_systems: "EHR",
      tech_stack: "AWS",
      existing_controls: "MFA",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty phi_systems", () => {
    const result = AiRiskInputSchema.safeParse({
      industry: "Healthcare",
      employee_count: 50,
      entity_type: "Covered Entity",
      phi_systems: "",
      tech_stack: "AWS",
      existing_controls: "MFA",
    });
    expect(result.success).toBe(false);
  });
});

describe("AiRiskOutputSchema", () => {
  it("accepts a valid RiskAssessmentOutput from the AI service", () => {
    const result = AiRiskOutputSchema.safeParse(validOutput);
    expect(result.success).toBe(true);
  });

  it("rejects uppercase risk levels (Pydantic emits lowercase)", () => {
    const result = AiRiskOutputSchema.safeParse({
      ...validOutput,
      overall_risk_level: "MEDIUM",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown risk level values", () => {
    const result = AiRiskOutputSchema.safeParse({
      ...validOutput,
      overall_risk_level: "severe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects threats array with zero items", () => {
    const result = AiRiskOutputSchema.safeParse({
      ...validOutput,
      threats: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a threat missing controls_affected", () => {
    const broken = {
      ...validOutput,
      threats: [{ ...validThreat, controls_affected: [] }, ...validOutput.threats.slice(1)],
    };
    const result = AiRiskOutputSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it("rejects missing critical_gaps", () => {
    const { critical_gaps: _omit, ...rest } = validOutput;
    void _omit;
    const result = AiRiskOutputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects non-array immediate_actions", () => {
    const result = AiRiskOutputSchema.safeParse({
      ...validOutput,
      immediate_actions: "do this",
    });
    expect(result.success).toBe(false);
  });
});
