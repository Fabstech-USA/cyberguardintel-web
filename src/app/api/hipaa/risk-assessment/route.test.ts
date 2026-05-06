import { describe, expect, it } from "vitest";
import { RiskLevel } from "@/generated/prisma";
import {
  type AiRiskOutput,
  mapAiOutputToPersistInput,
} from "@/lib/ai-risk-assessment";

const sampleOutput: AiRiskOutput = {
  executive_summary: "Posture is acceptable with two notable gaps.",
  scope: "EHR (Epic), patient portal, S3 backups",
  threats: [
    {
      threat_name: "Phishing",
      threat_source: "human",
      likelihood: "medium",
      impact: "high",
      overall_risk: "high",
      controls_affected: ["164.308(a)(5)"],
      current_controls: "Annual training",
      recommendation: "Quarterly phishing simulations",
    },
    {
      threat_name: "Stolen laptop",
      threat_source: "human",
      likelihood: "low",
      impact: "high",
      overall_risk: "medium",
      controls_affected: ["164.310(d)(1)"],
      current_controls: "FileVault",
      recommendation: "MDM enrollment",
    },
  ],
  overall_risk_level: "high",
  critical_gaps: ["No DLP", "Stale access reviews"],
  immediate_actions: ["Enable DLP", "Run access review", "Roll keys", "Enable WAF", "Patch EHR"],
  long_term_actions: [
    "SOC2 readiness",
    "Vendor BAA tracking",
    "Penetration test",
    "DR drill",
    "Encryption-at-rest sweep",
  ],
};

describe("mapAiOutputToPersistInput", () => {
  it("maps the AI scope and executive summary into Prisma columns", () => {
    const out = mapAiOutputToPersistInput(sampleOutput);
    expect(out.scope).toBe(sampleOutput.scope);
    const recs = out.recommendations as {
      executive_summary: string;
      immediate: string[];
      long_term: string[];
    };
    expect(recs.executive_summary).toBe(sampleOutput.executive_summary);
    expect(recs.immediate).toEqual(sampleOutput.immediate_actions);
    expect(recs.long_term).toEqual(sampleOutput.long_term_actions);
  });

  it("uppercases the AI risk level into the Prisma RiskLevel enum", () => {
    expect(mapAiOutputToPersistInput(sampleOutput).riskLevel).toBe(
      RiskLevel.HIGH
    );
    expect(
      mapAiOutputToPersistInput({ ...sampleOutput, overall_risk_level: "low" })
        .riskLevel
    ).toBe(RiskLevel.LOW);
    expect(
      mapAiOutputToPersistInput({
        ...sampleOutput,
        overall_risk_level: "critical",
      }).riskLevel
    ).toBe(RiskLevel.CRITICAL);
    expect(
      mapAiOutputToPersistInput({
        ...sampleOutput,
        overall_risk_level: "medium",
      }).riskLevel
    ).toBe(RiskLevel.MEDIUM);
  });

  it("wraps critical_gaps as objects under the vulnerabilities column", () => {
    const out = mapAiOutputToPersistInput(sampleOutput);
    expect(out.vulnerabilities).toEqual([
      { description: "No DLP" },
      { description: "Stale access reviews" },
    ]);
  });

  it("passes the threats array through unchanged", () => {
    const out = mapAiOutputToPersistInput(sampleOutput);
    expect(out.threats).toEqual(sampleOutput.threats);
  });
});
