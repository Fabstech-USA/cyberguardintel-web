import { addYears } from "date-fns";
import {
  FrameworkSlug,
  PolicyStatus,
  type Policy,
} from "@/generated/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

export type ApproveHipaaPolicyParams = {
  organizationId: string;
  clerkUserId: string;
  policyId: string;
};

export type ApproveHipaaPolicyResult = {
  policy: Policy;
  approvedVersion: number;
  newVersion: number;
};

/** Snapshot current revision, approve, and bump version for the next review cycle. */
export async function approveHipaaPolicy(
  params: ApproveHipaaPolicyParams
): Promise<ApproveHipaaPolicyResult> {
  const { organizationId, clerkUserId, policyId } = params;

  const existing = await prisma.policy.findFirst({
    where: {
      id: policyId,
      organizationId,
      frameworkSlug: FrameworkSlug.HIPAA,
    },
  });

  if (!existing) {
    throw new PolicyApproveError("NOT_FOUND", "Policy not found");
  }

  if (
    existing.status !== PolicyStatus.DRAFT &&
    existing.status !== PolicyStatus.UNDER_REVIEW
  ) {
    throw new PolicyApproveError(
      "INVALID_STATUS",
      "Only draft or under-review policies can be approved."
    );
  }

  const now = new Date();
  const approvedVersion = existing.version;
  const newVersion = approvedVersion + 1;

  const snapshotData = {
    title: existing.title,
    content: existing.content,
    approvedById: clerkUserId,
    approvedAt: now,
  };

  const policy = await prisma.$transaction(async (tx) => {
    // Upsert: migration backfill or a prior approval may already own this version row.
    await tx.policyVersion.upsert({
      where: {
        policyId_version: {
          policyId: existing.id,
          version: approvedVersion,
        },
      },
      create: {
        policyId: existing.id,
        version: approvedVersion,
        ...snapshotData,
      },
      update: snapshotData,
    });

    return tx.policy.update({
      where: { id: existing.id },
      data: {
        status: PolicyStatus.APPROVED,
        approvedById: clerkUserId,
        approvedAt: now,
        effectiveDate: now,
        reviewDate: addYears(now, 1),
        version: newVersion,
      },
    });
  });

  writeAuditLog({
    organizationId,
    actorId: clerkUserId,
    action: "policy.approved",
    resourceType: "Policy",
    resourceId: policy.id,
    metadata: {
      type: policy.type,
      approvedVersion,
      newVersion,
    },
  });

  return { policy, approvedVersion, newVersion };
}

export class PolicyApproveError extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "INVALID_STATUS",
    message: string
  ) {
    super(message);
    this.name = "PolicyApproveError";
  }
}
