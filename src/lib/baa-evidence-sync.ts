import {
  BaaStatus,
  EvidenceSource,
  FrameworkSlug,
  type BaaRecord,
} from "@/generated/prisma";
import { computeExpiresAt, triggerHipaaScoreRecalculation } from "@/lib/hipaa-scoring";
import { prisma } from "@/lib/prisma";

/** HIPAA control for executed BAAs with vendors (wizard + Security Rule catalog). */
export const BAA_EVIDENCE_CONTROL_REF = "164.314(a)(2)(i)-(iii)";

type BaaEvidenceInput = Pick<
  BaaRecord,
  "id" | "vendorName" | "status" | "signedAt" | "expiresAt" | "documentS3Key"
>;

async function resolveBaaOrgControlId(
  organizationId: string
): Promise<string | null> {
  const framework = await prisma.framework.findUnique({
    where: { slug: FrameworkSlug.HIPAA },
    select: { id: true },
  });
  if (!framework) return null;

  const orgControl = await prisma.orgControl.findFirst({
    where: {
      organizationId,
      frameworkControl: {
        controlRef: BAA_EVIDENCE_CONTROL_REF,
        frameworkId: framework.id,
      },
    },
    select: { id: true },
  });

  return orgControl?.id ?? null;
}

async function findEvidenceForBaa(
  organizationId: string,
  baaRecordId: string
): Promise<{ id: string } | null> {
  return prisma.evidence.findFirst({
    where: {
      organizationId,
      metadata: {
        path: ["baaRecordId"],
        equals: baaRecordId,
      },
    },
    select: { id: true },
  });
}

/** Mirror a BAA tracker row into HIPAA evidence for readiness scoring. */
export async function syncBaaEvidenceForRecord(
  organizationId: string,
  baa: BaaEvidenceInput
): Promise<void> {
  const orgControlId = await resolveBaaOrgControlId(organizationId);
  if (!orgControlId) return;

  const collectedAt = baa.signedAt ?? new Date();
  const expiresAt =
    baa.expiresAt ??
    (baa.status === BaaStatus.SIGNED || baa.status === BaaStatus.NOT_REQUIRED
      ? computeExpiresAt(collectedAt, "report")
      : null);

  const metadata = {
    evidenceType: "report",
    baaRecordId: baa.id,
    baaStatus: baa.status,
  };

  const data = {
    title: `BAA: ${baa.vendorName}`,
    description: `Business Associate Agreement tracking for ${baa.vendorName}`,
    sourceType: EvidenceSource.MANUAL,
    s3Key: baa.documentS3Key,
    mimeType: baa.documentS3Key ? "application/pdf" : null,
    collectedAt,
    expiresAt,
    metadata,
    isValid: true,
  };

  const existing = await findEvidenceForBaa(organizationId, baa.id);
  if (existing) {
    await prisma.evidence.update({
      where: { id: existing.id },
      data: {
        ...data,
        orgControlId,
      },
    });
    return;
  }

  await prisma.evidence.create({
    data: {
      organizationId,
      orgControlId,
      ...data,
    },
  });
}

export async function removeBaaEvidence(
  organizationId: string,
  baaRecordId: string
): Promise<void> {
  await prisma.evidence.deleteMany({
    where: {
      organizationId,
      metadata: {
        path: ["baaRecordId"],
        equals: baaRecordId,
      },
    },
  });
}

/** Sync every BAA tracker row to evidence (idempotent). */
export async function ensureBaaEvidenceSynced(
  organizationId: string
): Promise<void> {
  const records = await prisma.baaRecord.findMany({
    where: { organizationId },
    select: {
      id: true,
      vendorName: true,
      status: true,
      signedAt: true,
      expiresAt: true,
      documentS3Key: true,
    },
  });

  for (const baa of records) {
    await syncBaaEvidenceForRecord(organizationId, baa);
  }
}

export async function countBaaLinkedEvidence(
  organizationId: string
): Promise<number> {
  return prisma.evidence.count({
    where: {
      organizationId,
      title: { startsWith: "BAA:" },
    },
  });
}

/** Sync BAA → evidence and recalculate org readiness score. */
export async function syncBaaAndRecalculateScore(
  organizationId: string,
  baa: BaaEvidenceInput
): Promise<void> {
  await syncBaaEvidenceForRecord(organizationId, baa);
  await triggerHipaaScoreRecalculation(organizationId);
}

export async function removeBaaAndRecalculateScore(
  organizationId: string,
  baaRecordId: string
): Promise<void> {
  await removeBaaEvidence(organizationId, baaRecordId);
  await triggerHipaaScoreRecalculation(organizationId);
}
