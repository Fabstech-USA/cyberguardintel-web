import { beforeEach, describe, expect, it, vi } from "vitest";
import { OrgRole } from "@/generated/prisma";

const {
  orgControlFindFirstMock,
  orgControlFindUniqueMock,
  orgControlUpdateMock,
  orgMemberFindUniqueMock,
  writeAuditLogMock,
  triggerRecalcMock,
} = vi.hoisted(() => ({
  orgControlFindFirstMock: vi.fn(),
  orgControlFindUniqueMock: vi.fn(),
  orgControlUpdateMock: vi.fn(),
  orgMemberFindUniqueMock: vi.fn(),
  writeAuditLogMock: vi.fn(),
  triggerRecalcMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    orgControl: {
      findFirst: orgControlFindFirstMock,
      findUnique: orgControlFindUniqueMock,
      update: orgControlUpdateMock,
    },
    orgMember: {
      findUnique: orgMemberFindUniqueMock,
    },
  },
}));

vi.mock("@/lib/audit-log", () => ({
  writeAuditLog: writeAuditLogMock,
}));

vi.mock("@/lib/hipaa-scoring", () => ({
  triggerHipaaScoreRecalculation: triggerRecalcMock,
}));

import {
  assignOrgControlOwner,
  ControlOwnerError,
} from "@/lib/hipaa-control-owner";

describe("assignOrgControlOwner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    triggerRecalcMock.mockResolvedValue(72.5);
  });

  it("rejects MEMBER", async () => {
    await expect(
      assignOrgControlOwner({
        organizationId: "org_1",
        actorId: "user_actor",
        orgRole: OrgRole.MEMBER,
        orgControlId: "oc_1",
        ownerId: "user_2",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" } satisfies Partial<ControlOwnerError>);
  });

  it("rejects AUDITOR", async () => {
    await expect(
      assignOrgControlOwner({
        organizationId: "org_1",
        actorId: "user_actor",
        orgRole: OrgRole.AUDITOR,
        orgControlId: "oc_1",
        ownerId: "user_2",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects missing control", async () => {
    orgControlFindFirstMock.mockResolvedValue(null);
    await expect(
      assignOrgControlOwner({
        organizationId: "org_1",
        actorId: "user_actor",
        orgRole: OrgRole.ADMIN,
        orgControlId: "missing",
        ownerId: "user_2",
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects non-member ownerId", async () => {
    orgControlFindFirstMock.mockResolvedValue({
      id: "oc_1",
      ownerId: null,
      score: 40,
    });
    orgMemberFindUniqueMock.mockResolvedValue(null);

    await expect(
      assignOrgControlOwner({
        organizationId: "org_1",
        actorId: "user_actor",
        orgRole: OrgRole.OWNER,
        orgControlId: "oc_1",
        ownerId: "user_outsider",
      })
    ).rejects.toMatchObject({ code: "INVALID_OWNER" });
  });

  it("assigns owner, audits, and recalculates", async () => {
    orgControlFindFirstMock.mockResolvedValue({
      id: "oc_1",
      ownerId: null,
      score: 40,
    });
    orgMemberFindUniqueMock.mockResolvedValue({ id: "mem_1" });
    orgControlUpdateMock.mockResolvedValue({
      id: "oc_1",
      ownerId: "user_2",
      score: 40,
    });
    orgControlFindUniqueMock.mockResolvedValue({
      id: "oc_1",
      ownerId: "user_2",
      score: 50,
    });

    const result = await assignOrgControlOwner({
      organizationId: "org_1",
      actorId: "user_actor",
      orgRole: OrgRole.ADMIN,
      orgControlId: "oc_1",
      ownerId: "user_2",
    });

    expect(result).toEqual({
      id: "oc_1",
      ownerId: "user_2",
      score: 50,
    });
    expect(orgControlUpdateMock).toHaveBeenCalledWith({
      where: { id: "oc_1" },
      data: { ownerId: "user_2" },
      select: { id: true, ownerId: true, score: true },
    });
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "org_control.owner_assigned",
        resourceId: "oc_1",
      })
    );
    expect(triggerRecalcMock).toHaveBeenCalledWith("org_1");
  });

  it("clears owner", async () => {
    orgControlFindFirstMock.mockResolvedValue({
      id: "oc_1",
      ownerId: "user_2",
      score: 50,
    });
    orgControlUpdateMock.mockResolvedValue({
      id: "oc_1",
      ownerId: null,
      score: 50,
    });
    orgControlFindUniqueMock.mockResolvedValue({
      id: "oc_1",
      ownerId: null,
      score: 40,
    });

    const result = await assignOrgControlOwner({
      organizationId: "org_1",
      actorId: "user_actor",
      orgRole: OrgRole.OWNER,
      orgControlId: "oc_1",
      ownerId: null,
    });

    expect(result.ownerId).toBeNull();
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "org_control.owner_cleared" })
    );
    expect(triggerRecalcMock).toHaveBeenCalledWith("org_1");
  });

  it("no-ops when owner unchanged", async () => {
    orgControlFindFirstMock.mockResolvedValue({
      id: "oc_1",
      ownerId: "user_2",
      score: 55,
    });
    orgMemberFindUniqueMock.mockResolvedValue({ id: "mem_1" });

    const result = await assignOrgControlOwner({
      organizationId: "org_1",
      actorId: "user_actor",
      orgRole: OrgRole.ADMIN,
      orgControlId: "oc_1",
      ownerId: "user_2",
    });

    expect(result.score).toBe(55);
    expect(orgControlUpdateMock).not.toHaveBeenCalled();
    expect(triggerRecalcMock).not.toHaveBeenCalled();
  });
});
