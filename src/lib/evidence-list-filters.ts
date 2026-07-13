import {
  EvidenceSource,
  type Prisma,
} from "@/generated/prisma";
import type { FreshnessTier } from "@/lib/evidence-freshness";

export type EvidenceListFilters = {
  organizationId: string;
  source?: string;
  /** Prefer over `source` when filtering to a specific connected integration. */
  integrationId?: string;
  controlRef?: string;
  /** When set (non-empty), filter evidence to any of these control refs. */
  controlRefs?: string[];
  freshness?: FreshnessTier;
  collectedFrom?: Date;
  collectedTo?: Date;
  q?: string;
  cursor?: string;
  limit?: number;
};

type EvidenceCursor = {
  collectedAt: string;
  id: string;
};

export function encodeEvidenceCursor(cursor: EvidenceCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeEvidenceCursor(raw: string): EvidenceCursor | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8")
    ) as EvidenceCursor;
    if (
      typeof parsed.collectedAt === "string" &&
      typeof parsed.id === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function buildEvidenceWhere(
  filters: EvidenceListFilters
): Prisma.EvidenceWhereInput {
  const andParts: Prisma.EvidenceWhereInput[] = [
    { organizationId: filters.organizationId, isValid: true },
  ];

  if (filters.integrationId) {
    andParts.push({
      sourceType: EvidenceSource.INTEGRATION,
      integrationId: filters.integrationId,
    });
  } else if (filters.source === "manual") {
    andParts.push({ sourceType: EvidenceSource.MANUAL });
  } else if (filters.source === "ai_generated") {
    andParts.push({ sourceType: EvidenceSource.AI_GENERATED });
  } else if (filters.source) {
    andParts.push({
      sourceType: EvidenceSource.INTEGRATION,
      integration: { type: filters.source },
    });
  }

  if (filters.controlRefs && filters.controlRefs.length > 0) {
    andParts.push({
      orgControl: {
        frameworkControl: { controlRef: { in: filters.controlRefs } },
      },
    });
  } else if (filters.controlRef) {
    andParts.push({
      orgControl: {
        frameworkControl: { controlRef: filters.controlRef },
      },
    });
  }

  if (filters.collectedFrom || filters.collectedTo) {
    andParts.push({
      collectedAt: {
        ...(filters.collectedFrom ? { gte: filters.collectedFrom } : {}),
        ...(filters.collectedTo ? { lte: filters.collectedTo } : {}),
      },
    });
  }

  const q = filters.q?.trim();
  if (q) {
    andParts.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        {
          orgControl: {
            frameworkControl: { controlRef: { contains: q, mode: "insensitive" } },
          },
        },
      ],
    });
  }

  return { AND: andParts };
}

export function applyEvidenceCursor(
  where: Prisma.EvidenceWhereInput,
  cursor: EvidenceCursor
): Prisma.EvidenceWhereInput {
  const collectedAt = new Date(cursor.collectedAt);
  return {
    AND: [
      where,
      {
        OR: [
          { collectedAt: { lt: collectedAt } },
          { collectedAt, id: { lt: cursor.id } },
        ],
      },
    ],
  };
}
