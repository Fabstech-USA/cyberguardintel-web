import type { IntegrationStatus, PlanType } from "@/generated/prisma";

import {
  getIntegrationLimit,
  IntegrationLimitError,
} from "@/lib/integration-limits";
import { prisma } from "@/lib/prisma";

const CONNECTED_STATUSES: IntegrationStatus[] = ["ACTIVE", "PAUSED", "ERROR"];

export async function countConnectedIntegrations(
  organizationId: string
): Promise<number> {
  return prisma.integration.count({
    where: {
      organizationId,
      status: { in: CONNECTED_STATUSES },
    },
  });
}

export async function assertIntegrationCapacity(
  organizationId: string,
  plan: PlanType,
  options?: { excludeType?: string }
): Promise<void> {
  const limit = getIntegrationLimit(plan);
  if (!Number.isFinite(limit)) {
    return;
  }

  const used = await countConnectedIntegrations(organizationId);
  if (options?.excludeType) {
    const existing = await prisma.integration.findUnique({
      where: {
        organizationId_type: {
          organizationId,
          type: options.excludeType,
        },
      },
      select: { status: true },
    });
    if (existing && CONNECTED_STATUSES.includes(existing.status)) {
      return;
    }
  }

  if (used >= limit) {
    throw new IntegrationLimitError(used, limit, plan);
  }
}
