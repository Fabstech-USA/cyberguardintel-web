import { describe, expect, it, vi, beforeEach } from "vitest";

const {
  frameworkFindUniqueMock,
  orgFrameworkFindUniqueMock,
  orgControlFindManyMock,
  policyCountMock,
  transactionMock,
  orgControlUpdateMock,
  orgFrameworkUpdateMock,
} = vi.hoisted(() => ({
  frameworkFindUniqueMock: vi.fn(),
  orgFrameworkFindUniqueMock: vi.fn(),
  orgControlFindManyMock: vi.fn(),
  policyCountMock: vi.fn(),
  transactionMock: vi.fn(),
  orgControlUpdateMock: vi.fn(),
  orgFrameworkUpdateMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    framework: { findUnique: frameworkFindUniqueMock },
    orgFramework: {
      findUnique: orgFrameworkFindUniqueMock,
      update: orgFrameworkUpdateMock,
    },
    orgControl: {
      findMany: orgControlFindManyMock,
      update: orgControlUpdateMock,
    },
    policy: { count: policyCountMock },
    $transaction: transactionMock,
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  FRESHNESS_DAYS,
  WEIGHTS,
  computeExpiresAt,
  isEvidenceFresh,
  recalculateHipaaScore,
  scoreControl,
  triggerHipaaScoreRecalculation,
} from "@/lib/hipaa-scoring";
import { revalidatePath } from "next/cache";

describe("hipaa-scoring helpers", () => {
  it("exports architecture weights", () => {
    expect(WEIGHTS.evidence_completeness).toBe(0.45);
    expect(WEIGHTS.evidence_freshness).toBe(0.25);
    expect(WEIGHTS.policy_approved).toBe(0.2);
    expect(WEIGHTS.owner_assigned).toBe(0.1);
  });

  it("exports FRESHNESS_DAYS map", () => {
    expect(FRESHNESS_DAYS.access_review).toBe(90);
    expect(FRESHNESS_DAYS.vulnerability_scan).toBe(30);
  });

  it("isEvidenceFresh uses expiresAt when set", () => {
    const now = new Date("2026-05-22T12:00:00Z");
    expect(
      isEvidenceFresh(
        {
          expiresAt: new Date("2026-06-01T00:00:00Z"),
          collectedAt: now,
          metadata: null,
        },
        now
      )
    ).toBe(true);
    expect(
      isEvidenceFresh(
        {
          expiresAt: new Date("2026-01-01T00:00:00Z"),
          collectedAt: now,
          metadata: null,
        },
        now
      )
    ).toBe(false);
  });

  it("isEvidenceFresh falls back to metadata evidenceType + FRESHNESS_DAYS", () => {
    const collectedAt = new Date("2026-05-01T00:00:00Z");
    const now = new Date("2026-05-22T00:00:00Z");
    expect(
      isEvidenceFresh(
        {
          expiresAt: null,
          collectedAt,
          metadata: { evidenceType: "vulnerability_scan" },
        },
        now
      )
    ).toBe(true);
    expect(
      isEvidenceFresh(
        {
          expiresAt: null,
          collectedAt: new Date("2026-01-01T00:00:00Z"),
          metadata: { evidenceType: "vulnerability_scan" },
        },
        now
      )
    ).toBe(false);
  });

  it("computeExpiresAt uses FRESHNESS_DAYS", () => {
    const collectedAt = new Date("2026-05-01T00:00:00Z");
    const expires = computeExpiresAt(collectedAt, "log");
    expect(expires).not.toBeNull();
    expect(expires!.getTime()).toBe(
      collectedAt.getTime() + 30 * 24 * 60 * 60 * 1000
    );
  });
});

describe("scoreControl", () => {
  const now = new Date("2026-05-22T12:00:00Z");

  it("weights completeness, freshness, policy, and owner", () => {
    const score = scoreControl({
      evidence: [
        {
          expiresAt: new Date("2027-01-01"),
          collectedAt: now,
          metadata: null,
        },
        {
          expiresAt: new Date("2020-01-01"),
          collectedAt: now,
          metadata: null,
        },
      ],
      policyScore: 0.5,
      ownerId: "user_1",
      now,
    });

    const expected =
      1.0 * WEIGHTS.evidence_completeness +
      0.5 * WEIGHTS.evidence_freshness +
      0.5 * WEIGHTS.policy_approved +
      1.0 * WEIGHTS.owner_assigned;

    expect(score).toBeCloseTo(expected, 5);
  });

  it("returns 0 when no evidence and no owner", () => {
    expect(
      scoreControl({
        evidence: [],
        policyScore: 0,
        ownerId: null,
        now,
      })
    ).toBe(0);
  });
});

describe("recalculateHipaaScore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    frameworkFindUniqueMock.mockResolvedValue({ id: "fw_hipaa" });
    orgFrameworkFindUniqueMock.mockResolvedValue({ id: "of_1" });
    policyCountMock.mockResolvedValue(6);
    transactionMock.mockImplementation(async (ops: unknown[]) => {
      if (Array.isArray(ops)) {
        for (const op of ops) {
          if (typeof op === "object" && op !== null && "then" in op) {
            await op;
          }
        }
      }
    });
    orgControlUpdateMock.mockResolvedValue({});
    orgFrameworkUpdateMock.mockResolvedValue({});
  });

  it("returns 0 when HIPAA framework is missing", async () => {
    frameworkFindUniqueMock.mockResolvedValue(null);
    const score = await recalculateHipaaScore("org_1");
    expect(score).toBe(0);
  });

  it("returns 0 when org is not enrolled in HIPAA", async () => {
    orgFrameworkFindUniqueMock.mockResolvedValue(null);
    const score = await recalculateHipaaScore("org_1");
    expect(score).toBe(0);
  });

  it("persists averaged score and per-control scores", async () => {
    const now = new Date("2026-05-22T12:00:00Z");
    orgControlFindManyMock.mockResolvedValue([
      {
        id: "oc_1",
        ownerId: "user_1",
        evidence: [
          {
            expiresAt: new Date("2027-01-01"),
            collectedAt: now,
            metadata: null,
          },
        ],
      },
      {
        id: "oc_2",
        ownerId: null,
        evidence: [],
      },
    ]);

    const score = await recalculateHipaaScore("org_1");

    expect(score).toBeGreaterThan(0);
    expect(transactionMock).toHaveBeenCalled();
    expect(orgFrameworkUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "of_1" },
        data: expect.objectContaining({
          score: expect.any(Number),
          scoreUpdatedAt: expect.any(Date),
        }),
      })
    );
    expect(orgControlUpdateMock).toHaveBeenCalledTimes(2);
  });
});

describe("triggerHipaaScoreRecalculation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    frameworkFindUniqueMock.mockResolvedValue({ id: "fw_hipaa" });
    orgFrameworkFindUniqueMock.mockResolvedValue({ id: "of_1" });
    policyCountMock.mockResolvedValue(0);
    orgControlFindManyMock.mockResolvedValue([]);
    transactionMock.mockResolvedValue([]);
    orgFrameworkUpdateMock.mockResolvedValue({});
  });

  it("revalidates the dashboard path", async () => {
    await triggerHipaaScoreRecalculation("org_1");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});
