import {
  FrameworkSlug,
  PolicyStatus,
  PolicyType,
  type Policy,
} from "@/generated/prisma";
import { appendCitationsToContent, type AiPolicyOutput } from "@/lib/ai-policy-contract";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

export async function upsertHipaaPolicyDraftFromAi(params: {
  organizationId: string;
  clerkUserId: string;
  output: AiPolicyOutput;
}): Promise<Policy> {
  const { organizationId, clerkUserId, output } = params;

  const content = appendCitationsToContent(
    output.full_markdown,
    output.cited_cfr_sources
  );

  const existing = await prisma.policy.findUnique({
    where: {
      organizationId_frameworkSlug_type: {
        organizationId,
        frameworkSlug: FrameworkSlug.HIPAA,
        type: output.policy_type,
      },
    },
    select: { id: true },
  });

  const row = await prisma.policy.upsert({
    where: {
      organizationId_frameworkSlug_type: {
        organizationId,
        frameworkSlug: FrameworkSlug.HIPAA,
        type: output.policy_type,
      },
    },
    create: {
      organizationId,
      frameworkSlug: FrameworkSlug.HIPAA,
      type: output.policy_type,
      title: output.title,
      content,
      aiGenerated: true,
      status: PolicyStatus.DRAFT,
      version: 1,
    },
    update: {
      title: output.title,
      content,
      aiGenerated: true,
      status: PolicyStatus.DRAFT,
      version: { increment: 1 },
      approvedById: null,
      approvedAt: null,
      effectiveDate: null,
      reviewDate: null,
    },
  });

  writeAuditLog({
    organizationId,
    actorId: clerkUserId,
    action: existing ? "policy.regenerated" : "policy.created",
    resourceType: "Policy",
    resourceId: row.id,
    metadata: {
      type: row.type,
      version: row.version,
      aiGenerated: true,
    },
  });

  return row;
}

export async function upsertHipaaPolicyDraftManual(params: {
  organizationId: string;
  clerkUserId: string;
  policyType: PolicyType;
  title: string;
  content: string;
  cited_cfr_sources?: string[];
  aiGenerated?: boolean;
}): Promise<Policy> {
  const {
    organizationId,
    clerkUserId,
    policyType,
    title,
    content,
    cited_cfr_sources,
    aiGenerated = false,
  } = params;

  const merged = appendCitationsToContent(content, cited_cfr_sources);

  const existing = await prisma.policy.findUnique({
    where: {
      organizationId_frameworkSlug_type: {
        organizationId,
        frameworkSlug: FrameworkSlug.HIPAA,
        type: policyType,
      },
    },
    select: { id: true },
  });

  const row = await prisma.policy.upsert({
    where: {
      organizationId_frameworkSlug_type: {
        organizationId,
        frameworkSlug: FrameworkSlug.HIPAA,
        type: policyType,
      },
    },
    create: {
      organizationId,
      frameworkSlug: FrameworkSlug.HIPAA,
      type: policyType,
      title,
      content: merged,
      aiGenerated,
      status: PolicyStatus.DRAFT,
      version: 1,
    },
    update: {
      title,
      content: merged,
      aiGenerated,
      status: PolicyStatus.DRAFT,
      version: { increment: 1 },
    },
  });

  writeAuditLog({
    organizationId,
    actorId: clerkUserId,
    action: existing ? "policy.updated" : "policy.created",
    resourceType: "Policy",
    resourceId: row.id,
    metadata: {
      type: row.type,
      version: row.version,
      aiGenerated,
    },
  });

  return row;
}

/** Save human edits without bumping version (same vN, updated content). */
export async function updateHipaaPolicyContent(params: {
  organizationId: string;
  clerkUserId: string;
  policyId: string;
  title: string;
  content: string;
}): Promise<Policy> {
  const { organizationId, clerkUserId, policyId, title, content } = params;

  const existing = await prisma.policy.findFirst({
    where: { id: policyId, organizationId, frameworkSlug: FrameworkSlug.HIPAA },
  });

  if (!existing) {
    throw new Error("Policy not found");
  }

  const row = await prisma.policy.update({
    where: { id: policyId },
    data: {
      title,
      content,
      aiGenerated: false,
    },
  });

  writeAuditLog({
    organizationId,
    actorId: clerkUserId,
    action: "policy.updated",
    resourceType: "Policy",
    resourceId: row.id,
    metadata: {
      type: row.type,
      version: row.version,
      aiGenerated: false,
      contentEdit: true,
    },
  });

  return row;
}
