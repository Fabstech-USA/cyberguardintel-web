import { z } from "zod";
import { type Prisma, RiskLevel } from "@/generated/prisma";

/**
 * AI-service contract for POST /hipaa/risk-assessment.
 * Mirrors `RiskAssessmentRequest` in cyberguardintel-ai/models/hipaa_models.py.
 */
export const AiRiskInputSchema = z.object({
  industry: z.string().min(1),
  employee_count: z.number().int().nonnegative(),
  entity_type: z.string().min(1),
  phi_systems: z.string().min(1),
  tech_stack: z.string().min(1),
  existing_controls: z.string().min(1),
});

export type AiRiskInput = z.infer<typeof AiRiskInputSchema>;

export const AiRiskLevelSchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);

export const ThreatItemSchema = z.object({
  threat_name: z.string(),
  threat_source: z.string(),
  likelihood: AiRiskLevelSchema,
  impact: AiRiskLevelSchema,
  overall_risk: AiRiskLevelSchema,
  controls_affected: z.array(z.string()).min(1).max(4),
  current_controls: z.string(),
  recommendation: z.string(),
});

export type ThreatItem = z.infer<typeof ThreatItemSchema>;

/**
 * Mirrors `RiskAssessmentOutput` in cyberguardintel-ai/chains/hipaa_risk_assessment.py.
 * The Pydantic model enforces exactly 5 threats, 3-4 critical_gaps, 5 immediate/long-term actions;
 * we relax to min/max ranges on the TS side so a near-miss from the LLM does not 502 the user.
 */
export const AiRiskOutputSchema = z.object({
  executive_summary: z.string(),
  scope: z.string(),
  threats: z.array(ThreatItemSchema).min(1),
  overall_risk_level: AiRiskLevelSchema,
  critical_gaps: z.array(z.string()).min(1),
  immediate_actions: z.array(z.string()).min(1),
  long_term_actions: z.array(z.string()).min(1),
});

export type AiRiskOutput = z.infer<typeof AiRiskOutputSchema>;

const RISK_LEVEL_BY_AI: Record<z.infer<typeof AiRiskLevelSchema>, RiskLevel> = {
  low: RiskLevel.LOW,
  medium: RiskLevel.MEDIUM,
  high: RiskLevel.HIGH,
  critical: RiskLevel.CRITICAL,
};

export type RiskAssessmentPersistInput = {
  scope: string;
  threats: Prisma.InputJsonValue;
  vulnerabilities: Prisma.InputJsonValue;
  riskLevel: RiskLevel;
  recommendations: Prisma.InputJsonValue;
};

/**
 * Map the AI service's structured output onto the columns of the
 * `RiskAssessment` Prisma model. The JSON columns absorb fields that
 * don't have a 1:1 SQL home (executive summary, immediate vs long-term
 * actions, critical gaps).
 */
export function mapAiOutputToPersistInput(
  ai: AiRiskOutput
): RiskAssessmentPersistInput {
  return {
    scope: ai.scope,
    threats: ai.threats as unknown as Prisma.InputJsonValue,
    vulnerabilities: ai.critical_gaps.map((description) => ({
      description,
    })) as unknown as Prisma.InputJsonValue,
    riskLevel: RISK_LEVEL_BY_AI[ai.overall_risk_level],
    recommendations: {
      executive_summary: ai.executive_summary,
      immediate: ai.immediate_actions,
      long_term: ai.long_term_actions,
    } as unknown as Prisma.InputJsonValue,
  };
}
