import type { PlanType } from "@/generated/prisma";

import {
  FrameworkLimitError,
  getFrameworkLimit,
} from "@/lib/framework-limits";
import { prisma } from "@/lib/prisma";

export async function countOrgFrameworks(
  organizationId: string
): Promise<number> {
  return prisma.orgFramework.count({
    where: { organizationId },
  });
}

/**
 * Ensures the org can enroll `additionalCount` new frameworks under its plan.
 * Already-enrolled frameworks should not be included in additionalCount.
 */
export async function assertFrameworkCapacity(
  organizationId: string,
  plan: PlanType,
  options?: { additionalCount?: number }
): Promise<void> {
  const limit = getFrameworkLimit(plan);
  if (!Number.isFinite(limit)) {
    return;
  }

  const additionalCount = options?.additionalCount ?? 1;
  if (additionalCount <= 0) {
    return;
  }

  const used = await countOrgFrameworks(organizationId);
  if (used + additionalCount > limit) {
    throw new FrameworkLimitError(used, limit, plan);
  }
}
