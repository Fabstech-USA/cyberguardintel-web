import { z } from "zod";
import { PolicyStatus, PolicyType } from "@/generated/prisma";
import {
  AiPolicyOptionalContextSchema,
  AiPolicyOrgSnapshotSchema,
  type AiPolicyOptionalContext,
  type AiPolicyOrgSnapshot,
} from "@/lib/policy-generation-context";

/** Payload shape sent to FastAPI `POST /hipaa/generate-policy`. */
export const AiGeneratePolicyRequestSchema = AiPolicyOrgSnapshotSchema.merge(
  AiPolicyOptionalContextSchema
).extend({
  policy_type: z.nativeEnum(PolicyType),
});

export type AiGeneratePolicyRequest = z.infer<
  typeof AiGeneratePolicyRequestSchema
>;

export type { AiPolicyOrgSnapshot, AiPolicyOptionalContext };

export { AiPolicyOrgSnapshotSchema, AiPolicyOptionalContextSchema };

export const AiPolicySectionSchema = z.object({
  heading: z.string(),
  body: z.string(),
});

export const AiPolicyOutputSchema = z.object({
  policy_type: z.nativeEnum(PolicyType),
  title: z.string(),
  sections: z.array(AiPolicySectionSchema),
  version: z.string(),
  cited_cfr_sources: z.array(z.string()),
  status: z.nativeEnum(PolicyStatus),
  full_markdown: z.string(),
});

export type AiPolicyOutput = z.infer<typeof AiPolicyOutputSchema>;

export function buildGeneratePolicyPayload(
  snapshot: AiPolicyOrgSnapshot & Partial<AiPolicyOptionalContext>,
  policyType: PolicyType
): AiGeneratePolicyRequest {
  return { ...snapshot, policy_type: policyType };
}

/** Append CFR references block for auditor-visible citations in stored markdown. */
export function appendCitationsToContent(
  markdown: string,
  citations: string[] | undefined
): string {
  if (!citations?.length) return markdown;
  const block = citations.map((c) => `- ${c}`).join("\n");
  return `${markdown.trim()}\n\n## Regulatory references\n\n${block}\n`;
}
