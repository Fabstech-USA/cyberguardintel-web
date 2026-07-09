import { addDays } from "date-fns";

import type { EvidenceFreshnessInput } from "@/lib/hipaa-scoring";

export const EXPIRING_SOON_DAYS = 14;

export type FreshnessTier = "fresh" | "expiring" | "stale";

const FRESHNESS_DAYS = {
  access_review: 90,
  vulnerability_scan: 30,
  config: 180,
  log: 30,
  training: 365,
  report: 90,
} as const;

function getMetadataEvidenceType(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>).evidenceType;
  return typeof value === "string" ? value : null;
}

function computeExpiresAt(collectedAt: Date, evidenceType: string): Date | null {
  if (!(evidenceType in FRESHNESS_DAYS)) return null;
  return addDays(
    collectedAt,
    FRESHNESS_DAYS[evidenceType as keyof typeof FRESHNESS_DAYS]
  );
}

export function resolveEffectiveExpiresAt(
  evidence: EvidenceFreshnessInput
): Date | null {
  if (evidence.expiresAt) {
    return evidence.expiresAt;
  }

  const evidenceType = getMetadataEvidenceType(evidence.metadata);
  if (evidenceType) {
    return computeExpiresAt(evidence.collectedAt, evidenceType);
  }

  return null;
}

export function getFreshnessTier(
  evidence: EvidenceFreshnessInput,
  now: Date = new Date()
): FreshnessTier {
  const effectiveExpiresAt = resolveEffectiveExpiresAt(evidence);
  if (!effectiveExpiresAt) {
    return "fresh";
  }

  const nowMs = now.getTime();
  const expiresMs = effectiveExpiresAt.getTime();

  if (expiresMs <= nowMs) {
    return "stale";
  }

  const expiringThreshold = addDays(now, EXPIRING_SOON_DAYS).getTime();
  if (expiresMs <= expiringThreshold) {
    return "expiring";
  }

  return "fresh";
}

export function getFreshnessLabel(tier: FreshnessTier): string {
  switch (tier) {
    case "fresh":
      return "Fresh";
    case "expiring":
      return "Expiring";
    case "stale":
      return "Stale";
  }
}
