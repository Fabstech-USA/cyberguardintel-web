import { ControlStatus } from "@/generated/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { canManageHipaaControls } from "@/lib/hipaa-policy-access";
import { CONTROL_STATUSES } from "@/lib/hipaa-control-status-shared";
import { triggerHipaaScoreRecalculation } from "@/lib/hipaa-scoring";
import { prisma } from "@/lib/prisma";

export {
  CONTROL_STATUSES,
  CONTROL_STATUS_LABELS,
} from "@/lib/hipaa-control-status-shared";

export class ControlStatusError extends Error {
  readonly code: "FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST";

  constructor(code: ControlStatusError["code"], message: string) {
    super(message);
    this.name = "ControlStatusError";
    this.code = code;
  }
}

export type UpdateOrgControlStatusResult = {
  id: string;
  status: ControlStatus;
  ownerId: string | null;
  score: number;
};

/**
 * Upgrade NOT_STARTED → IN_PROGRESS when activity starts (evidence or owner).
 * Never downgrades IMPLEMENTED / NEEDS_REVIEW / EXCEPTION / IN_PROGRESS.
 */
export async function advanceOrgControlToInProgressIfNeeded(
  orgControlId: string
): Promise<boolean> {
  const updated = await prisma.orgControl.updateMany({
    where: {
      id: orgControlId,
      status: ControlStatus.NOT_STARTED,
    },
    data: {
      status: ControlStatus.IN_PROGRESS,
      lastReviewedAt: new Date(),
    },
  });
  return updated.count > 0;
}

/**
 * Manual status change from the controls page (owners/admins only).
 */
export async function updateOrgControlStatus(params: {
  organizationId: string;
  actorId: string;
  orgRole: string;
  orgControlId: string;
  status: ControlStatus;
}): Promise<UpdateOrgControlStatusResult> {
  const { organizationId, actorId, orgRole, orgControlId, status } = params;

  if (!canManageHipaaControls(orgRole)) {
    throw new ControlStatusError(
      "FORBIDDEN",
      "Only owners or admins can update control status."
    );
  }

  if (!CONTROL_STATUSES.includes(status)) {
    throw new ControlStatusError("BAD_REQUEST", "Invalid control status.");
  }

  const orgControl = await prisma.orgControl.findFirst({
    where: { id: orgControlId, organizationId },
    select: { id: true, status: true, ownerId: true, score: true },
  });

  if (!orgControl) {
    throw new ControlStatusError("NOT_FOUND", "Control not found.");
  }

  if (orgControl.status === status) {
    return {
      id: orgControl.id,
      status: orgControl.status,
      ownerId: orgControl.ownerId,
      score: orgControl.score,
    };
  }

  const updated = await prisma.orgControl.update({
    where: { id: orgControl.id },
    data: {
      status,
      lastReviewedAt: new Date(),
    },
    select: { id: true, status: true, ownerId: true, score: true },
  });

  writeAuditLog({
    organizationId,
    actorId,
    action: "org_control.status_updated",
    resourceType: "OrgControl",
    resourceId: updated.id,
    metadata: {
      previousStatus: orgControl.status,
      status: updated.status,
    },
  });

  await triggerHipaaScoreRecalculation(organizationId);

  const refreshed = await prisma.orgControl.findUnique({
    where: { id: updated.id },
    select: { id: true, status: true, ownerId: true, score: true },
  });

  return {
    id: updated.id,
    status: refreshed?.status ?? updated.status,
    ownerId: refreshed?.ownerId ?? updated.ownerId,
    score: refreshed?.score ?? updated.score,
  };
}
