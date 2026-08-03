import { beforeEach, describe, expect, it, vi } from "vitest";
import { ControlStatus, OrgRole } from "@/generated/prisma";

const {
  orgControlFindFirstMock,
  orgControlFindUniqueMock,
  orgControlUpdateMock,
  orgControlUpdateManyMock,
  writeAuditLogMock,
  triggerRecalcMock,
} = vi.hoisted(() => ({
  orgControlFindFirstMock: vi.fn(),
  orgControlFindUniqueMock: vi.fn(),
  orgControlUpdateMock: vi.fn(),
  orgControlUpdateManyMock: vi.fn(),
  writeAuditLogMock: vi.fn(),
  triggerRecalcMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    orgControl: {
      findFirst: orgControlFindFirstMock,
      findUnique: orgControlFindUniqueMock,
      update: orgControlUpdateMock,
      updateMany: orgControlUpdateManyMock,
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
  advanceOrgControlToInProgressIfNeeded,
  updateOrgControlStatus,
} from "@/lib/hipaa-control-status";

describe("advanceOrgControlToInProgressIfNeeded", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("upgrades only NOT_STARTED rows", async () => {
    orgControlUpdateManyMock.mockResolvedValue({ count: 1 });
    await expect(advanceOrgControlToInProgressIfNeeded("oc_1")).resolves.toBe(
      true
    );
    expect(orgControlUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "oc_1", status: ControlStatus.NOT_STARTED },
        data: expect.objectContaining({
          status: ControlStatus.IN_PROGRESS,
        }),
      })
    );
  });

  it("returns false when nothing updated", async () => {
    orgControlUpdateManyMock.mockResolvedValue({ count: 0 });
    await expect(advanceOrgControlToInProgressIfNeeded("oc_1")).resolves.toBe(
      false
    );
  });
});

describe("updateOrgControlStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    triggerRecalcMock.mockResolvedValue(60);
  });

  it("rejects members", async () => {
    await expect(
      updateOrgControlStatus({
        organizationId: "org_1",
        actorId: "user_1",
        orgRole: OrgRole.MEMBER,
        orgControlId: "oc_1",
        status: ControlStatus.IMPLEMENTED,
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("updates status, audits, and recalculates", async () => {
    orgControlFindFirstMock.mockResolvedValue({
      id: "oc_1",
      status: ControlStatus.NOT_STARTED,
      ownerId: null,
      score: 10,
    });
    orgControlUpdateMock.mockResolvedValue({
      id: "oc_1",
      status: ControlStatus.IMPLEMENTED,
      ownerId: null,
      score: 10,
    });
    orgControlFindUniqueMock.mockResolvedValue({
      id: "oc_1",
      status: ControlStatus.IMPLEMENTED,
      ownerId: null,
      score: 10,
    });

    const result = await updateOrgControlStatus({
      organizationId: "org_1",
      actorId: "user_1",
      orgRole: OrgRole.ADMIN,
      orgControlId: "oc_1",
      status: ControlStatus.IMPLEMENTED,
    });

    expect(result.status).toBe(ControlStatus.IMPLEMENTED);
    expect(writeAuditLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "org_control.status_updated" })
    );
    expect(triggerRecalcMock).toHaveBeenCalledWith("org_1");
  });
});
