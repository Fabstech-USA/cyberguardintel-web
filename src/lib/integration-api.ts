import type { Integration, IntegrationStatus } from "@/generated/prisma";

export type IntegrationPublicDto = {
  id: string;
  type: string;
  displayName: string;
  status: IntegrationStatus;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncCount: number;
  errorMessage: string | null;
  createdAt: string;
};

export function toIntegrationPublicDto(
  integration: Integration
): IntegrationPublicDto {
  return {
    id: integration.id,
    type: integration.type,
    displayName: integration.displayName,
    status: integration.status,
    lastSyncAt: integration.lastSyncAt?.toISOString() ?? null,
    lastSyncStatus: integration.lastSyncStatus,
    lastSyncCount: integration.lastSyncCount,
    errorMessage: integration.errorMessage,
    createdAt: integration.createdAt.toISOString(),
  };
}
