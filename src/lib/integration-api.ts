import type { Integration, IntegrationStatus } from "@/generated/prisma";

export type IntegrationPublicDto = {
  id: string;
  type: string;
  displayName: string;
  status: IntegrationStatus;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  /** Items newly persisted in the most recent sync (0 when deduplicated). */
  lastSyncCount: number;
  /** Total valid evidence rows linked to this integration. */
  evidenceCount: number;
  errorMessage: string | null;
  createdAt: string;
};

type IntegrationWithCounts = Integration & {
  _count?: { evidence: number };
};

export function toIntegrationPublicDto(
  integration: IntegrationWithCounts
): IntegrationPublicDto {
  return {
    id: integration.id,
    type: integration.type,
    displayName: integration.displayName,
    status: integration.status,
    lastSyncAt: integration.lastSyncAt?.toISOString() ?? null,
    lastSyncStatus: integration.lastSyncStatus,
    lastSyncCount: integration.lastSyncCount,
    evidenceCount: integration._count?.evidence ?? 0,
    errorMessage: integration.errorMessage,
    createdAt: integration.createdAt.toISOString(),
  };
}
