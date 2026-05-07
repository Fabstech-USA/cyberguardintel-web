import { describe, expect, it } from "vitest";
import { z } from "zod";
import { Industry, RiskLevel } from "@/generated/prisma";
import {
  type AiRiskOutput,
  mapAiOutputToPersistInput,
} from "@/lib/ai-risk-assessment";
import {
  WIZARD_CONTROL_IDS,
  type WizardControlId,
} from "@/lib/risk-assessment-controls";

// Mirrors the schema in route.ts. The route file imports Clerk/Prisma at
// module-eval time, so per the repo convention (see
// src/app/api/onboarding/phi-systems/route.test.ts) we duplicate the schema
// here for cheap, isolated payload validation tests.
const HIPAA_SUBJECT_TYPES = [
  "covered_entity",
  "business_associate",
  "both",
] as const;
const ProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    hipaaSubjectType: z.enum(HIPAA_SUBJECT_TYPES).optional(),
    employeeCount: z.number().int().nonnegative().optional(),
    industry: z.nativeEnum(Industry).optional(),
  })
  .optional();
const WizardPayloadSchema = z.object({
  profile: ProfileSchema,
  implementedControlIds: z
    .array(
      z.enum(WIZARD_CONTROL_IDS as readonly [WizardControlId, ...WizardControlId[]])
    )
    .max(WIZARD_CONTROL_IDS.length),
});

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

describe("WizardPayloadSchema", () => {
  it("accepts an empty implementedControlIds array (zero controls in place)", () => {
    const result = WizardPayloadSchema.safeParse({
      implementedControlIds: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts the full wizard payload with all 9 control ids", () => {
    const result = WizardPayloadSchema.safeParse({
      profile: {
        name: "Sunrise Family Health",
        hipaaSubjectType: "covered_entity",
        employeeCount: 50,
        industry: Industry.HEALTHCARE,
      },
      implementedControlIds: [...WIZARD_CONTROL_IDS],
    });
    expect(result.success).toBe(true);
  });

  it("rejects payload missing implementedControlIds", () => {
    const result = WizardPayloadSchema.safeParse({
      profile: { name: "Sunrise" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown control ids", () => {
    const result = WizardPayloadSchema.safeParse({
      implementedControlIds: ["mfa", "not_a_real_control"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts partial profile updates", () => {
    const result = WizardPayloadSchema.safeParse({
      profile: { industry: Industry.HEALTHCARE },
      implementedControlIds: ["mfa"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative employeeCount", () => {
    const result = WizardPayloadSchema.safeParse({
      profile: { employeeCount: -5 },
      implementedControlIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty-string organization name", () => {
    const result = WizardPayloadSchema.safeParse({
      profile: { name: "   " },
      implementedControlIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid hipaaSubjectType", () => {
    const result = WizardPayloadSchema.safeParse({
      profile: { hipaaSubjectType: "neither" },
      implementedControlIds: [],
    });
    expect(result.success).toBe(false);
  });
});
