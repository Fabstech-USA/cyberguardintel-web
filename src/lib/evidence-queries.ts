import {
  EvidenceSource,
  type Prisma,
} from "@/generated/prisma";
import {
  getFreshnessTier,
  type FreshnessTier,
} from "@/lib/evidence-freshness";
import { getEvidenceSourceBadge } from "@/lib/evidence-source";
import {
  applyEvidenceCursor,
  buildEvidenceWhere,
  decodeEvidenceCursor,
  encodeEvidenceCursor,
  type EvidenceListFilters,
} from "@/lib/evidence-list-filters";
import { prisma } from "@/lib/prisma";

export type { EvidenceListFilters } from "@/lib/evidence-list-filters";
export {
  buildEvidenceWhere,
  decodeEvidenceCursor,
  encodeEvidenceCursor,
} from "@/lib/evidence-list-filters";

export type EvidenceListItem = {
  id: string;
  title: string;
  description: string | null;
  sourceType: EvidenceSource;
  sourceBadge: ReturnType<typeof getEvidenceSourceBadge>;
  controlRef: string;
  controlTitle: string;
  orgControlId: string;
  integrationId: string | null;
  integrationType: string | null;
  collectedAt: string;
  expiresAt: string | null;
  freshnessTier: FreshnessTier;
  fileHash: string | null;
  s3Key: string | null;
  mimeType: string | null;
  evidenceType: string | null;
};

export type EvidenceListResult = {
  items: EvidenceListItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const evidenceInclude = {
  orgControl: {
    select: {
      id: true,
      frameworkControl: {
        select: { controlRef: true, title: true },
      },
    },
  },
  integration: {
    select: { id: true, type: true, displayName: true },
  },
} satisfies Prisma.EvidenceInclude;

type EvidenceRow = Prisma.EvidenceGetPayload<{ include: typeof evidenceInclude }>;

function getMetadataEvidenceType(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>).evidenceType;
  return typeof value === "string" ? value : null;
}

function mapEvidenceRow(row: EvidenceRow): EvidenceListItem {
  const freshnessTier = getFreshnessTier({
    expiresAt: row.expiresAt,
    collectedAt: row.collectedAt,
    metadata: row.metadata,
  });

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    sourceType: row.sourceType,
    sourceBadge: getEvidenceSourceBadge({
      sourceType: row.sourceType,
      integration: row.integration,
    }),
    controlRef: row.orgControl.frameworkControl.controlRef,
    controlTitle: row.orgControl.frameworkControl.title,
    orgControlId: row.orgControl.id,
    integrationId: row.integrationId,
    integrationType: row.integration?.type ?? null,
    collectedAt: row.collectedAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    freshnessTier,
    fileHash: row.fileHash,
    s3Key: row.s3Key,
    mimeType: row.mimeType,
    evidenceType: getMetadataEvidenceType(row.metadata),
  };
}

export async function listEvidence(
  filters: EvidenceListFilters
): Promise<EvidenceListResult> {
  const limit = Math.min(Math.max(filters.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  let where = buildEvidenceWhere(filters);

  if (filters.cursor) {
    const decoded = decodeEvidenceCursor(filters.cursor);
    if (decoded) {
      where = applyEvidenceCursor(where, decoded);
    }
  }

  const fetchSize = filters.freshness ? Math.min(limit * 4, MAX_LIMIT) : limit + 1;

  const rows = await prisma.evidence.findMany({
    where,
    include: evidenceInclude,
    orderBy: [{ collectedAt: "desc" }, { id: "desc" }],
    take: fetchSize,
  });

  let mapped = rows.map(mapEvidenceRow);

  if (filters.freshness) {
    mapped = mapped.filter((item) => item.freshnessTier === filters.freshness);
  }

  const hasMore = mapped.length > limit || rows.length === fetchSize;
  const items = mapped.slice(0, limit);
  const last = items.at(-1);

  return {
    items,
    hasMore,
    nextCursor:
      last && hasMore
        ? encodeEvidenceCursor({
            collectedAt: last.collectedAt,
            id: last.id,
          })
        : null,
  };
}

export async function getEvidenceById(params: {
  organizationId: string;
  evidenceId: string;
}): Promise<EvidenceListItem | null> {
  const row = await prisma.evidence.findFirst({
    where: {
      id: params.evidenceId,
      organizationId: params.organizationId,
      isValid: true,
    },
    include: evidenceInclude,
  });

  return row ? mapEvidenceRow(row) : null;
}

export async function listEvidenceControlRefs(
  organizationId: string
): Promise<string[]> {
  const rows = await prisma.evidence.findMany({
    where: { organizationId, isValid: true },
    select: {
      orgControl: {
        select: {
          frameworkControl: { select: { controlRef: true } },
        },
      },
    },
    distinct: ["orgControlId"],
  });

  const refs = rows
    .map((row) => row.orgControl.frameworkControl.controlRef)
    .filter(Boolean);
  return [...new Set(refs)].sort();
}

export async function listOrgControlsForEvidence(
  organizationId: string
): Promise<Array<{ id: string; controlRef: string; controlTitle: string }>> {
  const rows = await prisma.orgControl.findMany({
    where: { organizationId },
    select: {
      id: true,
      frameworkControl: {
        select: { controlRef: true, title: true },
      },
    },
    orderBy: { frameworkControl: { controlRef: "asc" } },
  });

  return rows.map((row) => ({
    id: row.id,
    controlRef: row.frameworkControl.controlRef,
    controlTitle: row.frameworkControl.title,
  }));
}

export async function getEvidenceStats(organizationId: string): Promise<{
  total: number;
  fresh: number;
  stale: number;
  integrityVerified: number;
  lastSyncAt: string | null;
}> {
  const rows = await prisma.evidence.findMany({
    where: { organizationId, isValid: true },
    select: {
      expiresAt: true,
      collectedAt: true,
      metadata: true,
      fileHash: true,
      s3Key: true,
    },
  });

  let fresh = 0;
  let stale = 0;
  let integrityVerified = 0;
  for (const row of rows) {
    const tier = getFreshnessTier(row);
    if (tier === "stale") stale += 1;
    else fresh += 1;
    if (row.fileHash && row.s3Key) integrityVerified += 1;
  }

  const lastIntegrationSync = await prisma.integration.aggregate({
    where: { organizationId, lastSyncAt: { not: null } },
    _max: { lastSyncAt: true },
  });

  return {
    total: rows.length,
    fresh,
    stale,
    integrityVerified,
    lastSyncAt: lastIntegrationSync._max.lastSyncAt?.toISOString() ?? null,
  };
}
