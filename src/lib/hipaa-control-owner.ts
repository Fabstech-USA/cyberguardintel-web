import { writeAuditLog } from "@/lib/audit-log";
import { canManageHipaaControls } from "@/lib/hipaa-policy-access";
import { triggerHipaaScoreRecalculation } from "@/lib/hipaa-scoring";
import { prisma } from "@/lib/prisma";

export class ControlOwnerError extends Error {
  readonly code: "FORBIDDEN" | "NOT_FOUND" | "INVALID_OWNER" | "BAD_REQUEST";

  constructor(
    code: ControlOwnerError["code"],
    message: string
  ) {
    super(message);
    this.name = "ControlOwnerError";
    this.code = code;
  }
}

export type AssignOrgControlOwnerResult = {
  id: string;
  ownerId: string | null;
  score: number;
};

/**
 * Assign or clear the owner on a tenant-scoped OrgControl, then recalculate readiness.
 */
export async function assignOrgControlOwner(params: {
  organizationId: string;
  actorId: string;
  orgRole: string;
  orgControlId: string;
  ownerId: string | null;
}): Promise<AssignOrgControlOwnerResult> {
  const { organizationId, actorId, orgRole, orgControlId, ownerId } = params;

  if (!canManageHipaaControls(orgRole)) {
    throw new ControlOwnerError(
      "FORBIDDEN",
      "Only owners or admins can assign control owners."
    );
  }

  if (ownerId !== null && (typeof ownerId !== "string" || !ownerId.trim())) {
    throw new ControlOwnerError(
      "BAD_REQUEST",
      "ownerId must be a Clerk user id or null."
    );
  }

  const normalizedOwnerId = ownerId === null ? null : ownerId.trim();

  const orgControl = await prisma.orgControl.findFirst({
    where: { id: orgControlId, organizationId },
    select: { id: true, ownerId: true, score: true },
  });

  if (!orgControl) {
    throw new ControlOwnerError("NOT_FOUND", "Control not found.");
  }

  if (normalizedOwnerId !== null) {
    const member = await prisma.orgMember.findUnique({
      where: {
        clerkUserId_organizationId: {
          clerkUserId: normalizedOwnerId,
          organizationId,
        },
      },
      select: { id: true },
    });
    if (!member) {
      throw new ControlOwnerError(
        "INVALID_OWNER",
        "Owner must be a member of this organization."
      );
    }
  }

  if (orgControl.ownerId === normalizedOwnerId) {
    return {
      id: orgControl.id,
      ownerId: orgControl.ownerId,
      score: orgControl.score,
    };
  }

  const updated = await prisma.orgControl.update({
    where: { id: orgControl.id },
    data: { ownerId: normalizedOwnerId },
    select: { id: true, ownerId: true, score: true },
  });

  writeAuditLog({
    organizationId,
    actorId,
    action:
      normalizedOwnerId === null
        ? "org_control.owner_cleared"
        : "org_control.owner_assigned",
    resourceType: "OrgControl",
    resourceId: updated.id,
    metadata: {
      previousOwnerId: orgControl.ownerId,
      ownerId: normalizedOwnerId,
    },
  });

  const overall = await triggerHipaaScoreRecalculation(organizationId);

  const refreshed = await prisma.orgControl.findUnique({
    where: { id: updated.id },
    select: { id: true, ownerId: true, score: true },
  });

  return {
    id: updated.id,
    ownerId: refreshed?.ownerId ?? updated.ownerId,
    score: refreshed?.score ?? overall,
  };
}
