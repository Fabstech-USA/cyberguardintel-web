import {
  type Evidence,
  type EvidenceSource,
  type Prisma,
} from "@/generated/prisma";
import {
  computeExpiresAt,
  isFreshnessEvidenceType,
  triggerHipaaScoreRecalculation,
} from "@/lib/hipaa-scoring";
import { prisma } from "@/lib/prisma";

export type CreateEvidenceInput = {
  organizationId: string;
  orgControlId: string;
  title: string;
  description?: string | null;
  sourceType: EvidenceSource;
  integrationId?: string | null;
  s3Key?: string | null;
  mimeType?: string | null;
  fileHash?: string | null;
  collectedAt?: Date;
  expiresAt?: Date | null;
  /** Key into FRESHNESS_DAYS; used to set expiresAt when expiresAt is omitted. */
  evidenceType?: string;
  metadata?: Prisma.InputJsonValue;
};

function resolveExpiresAt(input: CreateEvidenceInput): Date | null | undefined {
  if (input.expiresAt !== undefined) return input.expiresAt;
  if (
    input.evidenceType &&
    isFreshnessEvidenceType(input.evidenceType) &&
    input.collectedAt
  ) {
    return computeExpiresAt(input.collectedAt, input.evidenceType);
  }
  if (input.evidenceType && isFreshnessEvidenceType(input.evidenceType)) {
    return computeExpiresAt(new Date(), input.evidenceType);
  }
  return undefined;
}

/** Create evidence and recalculate HIPAA readiness score. */
export async function createEvidence(
  input: CreateEvidenceInput
): Promise<Evidence> {
  const collectedAt = input.collectedAt ?? new Date();
  const expiresAt = resolveExpiresAt({ ...input, collectedAt });

  const evidence = await prisma.evidence.create({
    data: {
      organizationId: input.organizationId,
      orgControlId: input.orgControlId,
      title: input.title,
      description: input.description ?? null,
      sourceType: input.sourceType,
      integrationId: input.integrationId ?? null,
      s3Key: input.s3Key ?? null,
      mimeType: input.mimeType ?? null,
      fileHash: input.fileHash ?? null,
      collectedAt,
      ...(expiresAt !== undefined ? { expiresAt } : {}),
      metadata: input.metadata,
    },
  });

  await triggerHipaaScoreRecalculation(input.organizationId);
  return evidence;
}

/** Delete evidence and recalculate HIPAA readiness score. */
export async function deleteEvidence(params: {
  organizationId: string;
  evidenceId: string;
}): Promise<void> {
  const deleted = await prisma.evidence.deleteMany({
    where: {
      id: params.evidenceId,
      organizationId: params.organizationId,
    },
  });

  if (deleted.count > 0) {
    await triggerHipaaScoreRecalculation(params.organizationId);
  }
}

/** Update evidence and recalculate HIPAA readiness score. */
export async function updateEvidence(params: {
  organizationId: string;
  evidenceId: string;
  data: Prisma.EvidenceUpdateInput;
}): Promise<Evidence | null> {
  const existing = await prisma.evidence.findFirst({
    where: {
      id: params.evidenceId,
      organizationId: params.organizationId,
    },
  });

  if (!existing) return null;

  const evidence = await prisma.evidence.update({
    where: { id: existing.id },
    data: params.data,
  });

  await triggerHipaaScoreRecalculation(params.organizationId);
  return evidence;
}
