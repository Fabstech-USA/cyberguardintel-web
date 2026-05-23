import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  FrameworkSlug,
  PolicyStatus,
  PolicyType,
} from "@/generated/prisma";

const { findFirstMock, transactionMock, auditMock, scoreRecalcMock } =
  vi.hoisted(() => ({
    findFirstMock: vi.fn(),
    transactionMock: vi.fn(),
    auditMock: vi.fn(),
    scoreRecalcMock: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    policy: { findFirst: findFirstMock },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: auditMock,
}));

vi.mock("@/lib/hipaa-scoring", () => ({
  triggerHipaaScoreRecalculation: scoreRecalcMock,
}));

import {
  approveHipaaPolicy,
  PolicyApproveError,
} from "@/lib/hipaa-policy-approve";

const basePolicy = {
  id: "pol_1",
  organizationId: "org_1",
  frameworkSlug: FrameworkSlug.HIPAA,
  type: PolicyType.ACCESS_CONTROL,
  title: "Access Control",
  content: "# Policy\n\nBody",
  version: 2,
  status: PolicyStatus.DRAFT,
  aiGenerated: true,
  approvedById: null,
  approvedAt: null,
  effectiveDate: null,
  reviewDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("approveHipaaPolicy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scoreRecalcMock.mockResolvedValue(42);
  });

  it("snapshots current version, approves, and increments version", async () => {
    findFirstMock.mockResolvedValue(basePolicy);

    const updatedPolicy = {
      ...basePolicy,
      status: PolicyStatus.APPROVED,
      version: 3,
      approvedById: "user_1",
      approvedAt: new Date(),
    };

    const upsertVersionMock = vi.fn();
    const updatePolicyMock = vi.fn().mockResolvedValue(updatedPolicy);

    transactionMock.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          policyVersion: { upsert: upsertVersionMock },
          policy: { update: updatePolicyMock },
        })
    );

    const result = await approveHipaaPolicy({
      organizationId: "org_1",
      clerkUserId: "user_1",
      policyId: "pol_1",
    });

    expect(upsertVersionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          policyId_version: { policyId: "pol_1", version: 2 },
        },
        create: expect.objectContaining({
          policyId: "pol_1",
          version: 2,
          title: basePolicy.title,
          content: basePolicy.content,
          approvedById: "user_1",
        }),
        update: expect.objectContaining({
          title: basePolicy.title,
          content: basePolicy.content,
          approvedById: "user_1",
        }),
      })
    );

    expect(updatePolicyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PolicyStatus.APPROVED,
          version: 3,
        }),
      })
    );

    expect(result.approvedVersion).toBe(2);
    expect(result.newVersion).toBe(3);
    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "policy.approved",
        metadata: expect.objectContaining({
          approvedVersion: 2,
          newVersion: 3,
        }),
      })
    );

    expect(scoreRecalcMock).toHaveBeenCalledWith("org_1");
  });

  it("throws when policy is not found", async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(
      approveHipaaPolicy({
        organizationId: "org_1",
        clerkUserId: "user_1",
        policyId: "missing",
      })
    ).rejects.toBeInstanceOf(PolicyApproveError);
  });

  it("throws when policy is already approved", async () => {
    findFirstMock.mockResolvedValue({
      ...basePolicy,
      status: PolicyStatus.APPROVED,
    });

    await expect(
      approveHipaaPolicy({
        organizationId: "org_1",
        clerkUserId: "user_1",
        policyId: "pol_1",
      })
    ).rejects.toMatchObject({ code: "INVALID_STATUS" });
  });
});
