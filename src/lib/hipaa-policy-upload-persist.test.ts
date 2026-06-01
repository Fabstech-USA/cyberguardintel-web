import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FrameworkSlug,
  PolicyStatus,
  PolicyType,
} from "@/generated/prisma";

const {
  findUniqueMock,
  transactionMock,
  auditMock,
  scoreRecalcMock,
} = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  transactionMock: vi.fn(),
  auditMock: vi.fn(),
  scoreRecalcMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    policy: {
      findUnique: findUniqueMock,
    },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: auditMock,
}));

vi.mock("@/lib/hipaa-scoring", () => ({
  triggerHipaaScoreRecalculation: scoreRecalcMock,
}));

import { upsertHipaaPolicyFromUpload } from "@/lib/hipaa-policy-persist";

describe("upsertHipaaPolicyFromUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scoreRecalcMock.mockResolvedValue(42);
  });

  it("creates an approved policy with source metadata and version snapshot", async () => {
    findUniqueMock.mockResolvedValue(null);

    const createMock = vi.fn().mockResolvedValue({
      id: "pol_new",
      type: PolicyType.ACCESS_CONTROL,
      version: 1,
      status: PolicyStatus.APPROVED,
      aiGenerated: false,
    });
    const versionCreateMock = vi.fn();

    transactionMock.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          policy: { create: createMock },
          policyVersion: { create: versionCreateMock },
        })
    );

    await upsertHipaaPolicyFromUpload({
      organizationId: "org_1",
      clerkUserId: "user_1",
      policyType: PolicyType.ACCESS_CONTROL,
      title: "Access Control Policy",
      content: "# Access Control\n\nBody text long enough.",
      sourceS3Key: "hipaa/policies/org_1/file.pdf",
      sourceMimeType: "application/pdf",
      sourceFileName: "access-control.pdf",
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          aiGenerated: false,
          status: PolicyStatus.APPROVED,
          sourceS3Key: "hipaa/policies/org_1/file.pdf",
          sourceFileName: "access-control.pdf",
          approvedById: "user_1",
        }),
      })
    );

    expect(versionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          policyId: "pol_new",
          version: 1,
          approvedById: "user_1",
        }),
      })
    );

    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "policy.created",
        metadata: expect.objectContaining({
          autoApproved: true,
          sourceFileName: "access-control.pdf",
        }),
      })
    );

    expect(scoreRecalcMock).toHaveBeenCalledWith("org_1");
  });

  it("snapshots prior version and re-approves when replacing an existing policy", async () => {
    findUniqueMock.mockResolvedValue({
      id: "pol_existing",
      organizationId: "org_1",
      frameworkSlug: FrameworkSlug.HIPAA,
      type: PolicyType.ACCESS_CONTROL,
      title: "Old title",
      content: "# Old\n\nContent",
      version: 2,
      status: PolicyStatus.APPROVED,
      approvedById: "user_old",
      approvedAt: new Date("2024-01-01"),
    });

    const versionUpsertMock = vi.fn();
    const updateMock = vi.fn().mockResolvedValue({
      id: "pol_existing",
      type: PolicyType.ACCESS_CONTROL,
      version: 3,
      status: PolicyStatus.APPROVED,
      aiGenerated: false,
    });

    transactionMock.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          policyVersion: { upsert: versionUpsertMock },
          policy: { update: updateMock },
        })
    );

    await upsertHipaaPolicyFromUpload({
      organizationId: "org_1",
      clerkUserId: "user_1",
      policyType: PolicyType.ACCESS_CONTROL,
      title: "Access Control Policy",
      content: "# Access Control\n\nUpdated uploaded body.",
      sourceS3Key: "hipaa/policies/org_1/replacement.docx",
      sourceMimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      sourceFileName: "replacement.docx",
    });

    expect(versionUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          policyId_version: { policyId: "pol_existing", version: 2 },
        },
      })
    );

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PolicyStatus.APPROVED,
          version: { increment: 1 },
          approvedById: "user_1",
        }),
      })
    );

    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "policy.uploaded",
        metadata: expect.objectContaining({
          replacedExisting: true,
          autoApproved: true,
        }),
      })
    );
  });
});
