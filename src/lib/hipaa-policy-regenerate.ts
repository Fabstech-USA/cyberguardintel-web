import { FrameworkSlug, PolicyStatus, PolicyType, type Policy } from "@/generated/prisma";
import {
  AiGeneratePolicyRequestSchema,
  AiPolicyOutputSchema,
  buildGeneratePolicyPayload,
  loadOrganizationSnapshotForPolicyAi,
} from "@/lib/ai-policy-generation";
import { callAiService } from "@/lib/ai-client";
import { writeAuditLog } from "@/lib/audit-log";
import { upsertHipaaPolicyDraftFromAi } from "@/lib/hipaa-policy-persist";
import { prisma } from "@/lib/prisma";

export type RegenerateHipaaPolicyParams = {
  organizationId: string;
  clerkUserId: string;
  policyId: string;
  /** When true, writes policy.rejected before regenerating (AI draft rejection). */
  logRejection?: boolean;
};

export class PolicyRegenerateError extends Error {
  constructor(
    readonly code:
      | "NOT_FOUND"
      | "INVALID_STATUS"
      | "NOT_AI_DRAFT"
      | "ORG_NOT_FOUND"
      | "AI_PAYLOAD"
      | "AI_RESPONSE"
      | "AI_UNAVAILABLE",
    message: string
  ) {
    super(message);
    this.name = "PolicyRegenerateError";
  }
}

/** Generate a fresh AI draft for one policy type and persist (bumps version on existing row). */
export async function regenerateHipaaPolicyById(
  params: RegenerateHipaaPolicyParams
): Promise<Policy> {
  const { organizationId, clerkUserId, policyId, logRejection = false } =
    params;

  const existing = await prisma.policy.findFirst({
    where: {
      id: policyId,
      organizationId,
      frameworkSlug: FrameworkSlug.HIPAA,
    },
  });

  if (!existing) {
    throw new PolicyRegenerateError("NOT_FOUND", "Policy not found");
  }

  if (logRejection) {
    if (
      existing.status !== PolicyStatus.DRAFT &&
      existing.status !== PolicyStatus.UNDER_REVIEW
    ) {
      throw new PolicyRegenerateError(
        "INVALID_STATUS",
        "Only draft or under-review policies can be rejected."
      );
    }
    if (!existing.aiGenerated) {
      throw new PolicyRegenerateError(
        "NOT_AI_DRAFT",
        "Reject and regenerate is only available for AI-generated drafts."
      );
    }

    writeAuditLog({
      organizationId,
      actorId: clerkUserId,
      action: "policy.rejected",
      resourceType: "Policy",
      resourceId: existing.id,
      metadata: {
        type: existing.type,
        version: existing.version,
        reason: "regenerate",
      },
    });
  }

  return regenerateHipaaPolicyByType({
    organizationId,
    clerkUserId,
    policyType: existing.type,
  });
}

export async function regenerateHipaaPolicyByType(params: {
  organizationId: string;
  clerkUserId: string;
  policyType: PolicyType;
}): Promise<Policy> {
  const { organizationId, clerkUserId, policyType } = params;

  const snapshot = await loadOrganizationSnapshotForPolicyAi(organizationId);
  if (!snapshot) {
    throw new PolicyRegenerateError("ORG_NOT_FOUND", "Organization not found");
  }

  const payload = buildGeneratePolicyPayload(snapshot, policyType);
  const checked = AiGeneratePolicyRequestSchema.safeParse(payload);
  if (!checked.success) {
    throw new PolicyRegenerateError("AI_PAYLOAD", "Invalid AI request payload");
  }

  let raw: unknown;
  try {
    raw = await callAiService<unknown>("/hipaa/generate-policy", checked.data);
  } catch (err) {
    throw new PolicyRegenerateError(
      "AI_UNAVAILABLE",
      err instanceof Error ? err.message : "AI service unavailable"
    );
  }

  const out = AiPolicyOutputSchema.safeParse(raw);
  if (!out.success) {
    throw new PolicyRegenerateError("AI_RESPONSE", "Invalid AI response");
  }

  return upsertHipaaPolicyDraftFromAi({
    organizationId,
    clerkUserId,
    output: out.data,
  });
}
