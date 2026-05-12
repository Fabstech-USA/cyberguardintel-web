import { describe, expect, it } from "vitest";
import { BaaStatus, PhiFlowDataClassification } from "@/generated/prisma";
import {
  PhiFlowEdgeCreateSchema,
  PhiFlowEdgeUpdateSchema,
  PhiSystemCreateSchema,
  edgeBaaCompliant,
  edgeIsPhiGap,
  isBaaActive,
  legendBucketForSystem,
  canMutatePhiMap,
} from "@/lib/phi-map";

describe("PhiSystemCreateSchema", () => {
  it("accepts minimal valid payload", () => {
    const r = PhiSystemCreateSchema.safeParse({
      name: "Epic",
      systemType: "emr",
    });
    expect(r.success).toBe(true);
  });

  it("rejects invalid systemType", () => {
    const r = PhiSystemCreateSchema.safeParse({
      name: "X",
      systemType: "not_a_real_type",
    });
    expect(r.success).toBe(false);
  });
});

describe("PhiFlowEdgeCreateSchema", () => {
  it("requires exactly one target", () => {
    expect(
      PhiFlowEdgeCreateSchema.safeParse({
        sourcePhiSystemId: "clxxxxxxxxxxxxxxxxxxxxxx",
        targetPhiSystemId: "clyyyyyyyyyyyyyyyyyyyyyy",
      }).success
    ).toBe(true);

    expect(
      PhiFlowEdgeCreateSchema.safeParse({
        sourcePhiSystemId: "clxxxxxxxxxxxxxxxxxxxxxx",
        targetIntegrationId: "clzzzzzzzzzzzzzzzzzzzzzz",
      }).success
    ).toBe(true);

    expect(
      PhiFlowEdgeCreateSchema.safeParse({
        sourcePhiSystemId: "clxxxxxxxxxxxxxxxxxxxxxx",
      }).success
    ).toBe(false);

    expect(
      PhiFlowEdgeCreateSchema.safeParse({
        sourcePhiSystemId: "clxxxxxxxxxxxxxxxxxxxxxx",
        targetPhiSystemId: "clyyyyyyyyyyyyyyyyyyyyyy",
        targetIntegrationId: "clzzzzzzzzzzzzzzzzzzzzzz",
      }).success
    ).toBe(false);
  });
});

describe("PhiFlowEdgeUpdateSchema", () => {
  it("rejects empty object", () => {
    const r = PhiFlowEdgeUpdateSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it("accepts single field patch", () => {
    const r = PhiFlowEdgeUpdateSchema.safeParse({
      isExternalVendorFlow: true,
    });
    expect(r.success).toBe(true);
  });
});

describe("isBaaActive", () => {
  const now = new Date("2026-06-01T12:00:00Z");

  it("returns true for signed non-expired", () => {
    expect(
      isBaaActive(
        { status: BaaStatus.SIGNED, expiresAt: new Date("2027-01-01") },
        now
      )
    ).toBe(true);
  });

  it("returns false when expired", () => {
    expect(
      isBaaActive(
        { status: BaaStatus.SIGNED, expiresAt: new Date("2025-01-01") },
        now
      )
    ).toBe(false);
  });

  it("returns false for pending", () => {
    expect(
      isBaaActive({ status: BaaStatus.PENDING, expiresAt: null }, now)
    ).toBe(false);
  });

  it("returns true for not required", () => {
    expect(
      isBaaActive({ status: BaaStatus.NOT_REQUIRED, expiresAt: null }, now)
    ).toBe(true);
  });
});

describe("edgeBaaCompliant / edgeIsPhiGap", () => {
  const now = new Date("2026-06-01T12:00:00Z");

  it("treats de-identified as compliant regardless of external flag", () => {
    const edge = {
      isExternalVendorFlow: true,
      dataClassification: PhiFlowDataClassification.DE_IDENTIFIED,
      baaRecord: null,
    };
    expect(edgeBaaCompliant(edge, now)).toBe(true);
    expect(edgeIsPhiGap(edge, now)).toBe(false);
  });

  it("flags external PHI without BAA as gap", () => {
    const edge = {
      isExternalVendorFlow: true,
      dataClassification: PhiFlowDataClassification.PHI,
      baaRecord: null,
    };
    expect(edgeBaaCompliant(edge, now)).toBe(false);
    expect(edgeIsPhiGap(edge, now)).toBe(true);
  });

  it("clears gap when signed BAA present", () => {
    const edge = {
      isExternalVendorFlow: true,
      dataClassification: PhiFlowDataClassification.PHI,
      baaRecord: { status: BaaStatus.SIGNED, expiresAt: null },
    };
    expect(edgeBaaCompliant(edge, now)).toBe(true);
    expect(edgeIsPhiGap(edge, now)).toBe(false);
  });

  it("clears gap when BAA is not required", () => {
    const edge = {
      isExternalVendorFlow: true,
      dataClassification: PhiFlowDataClassification.PHI,
      baaRecord: { status: BaaStatus.NOT_REQUIRED, expiresAt: null },
    };
    expect(edgeBaaCompliant(edge, now)).toBe(true);
    expect(edgeIsPhiGap(edge, now)).toBe(false);
  });
});

describe("canMutatePhiMap", () => {
  it("denies AUDITOR", () => {
    expect(canMutatePhiMap("AUDITOR")).toBe(false);
  });

  it("allows MEMBER", () => {
    expect(canMutatePhiMap("MEMBER")).toBe(true);
  });
});

describe("legendBucketForSystem", () => {
  it("maps emr to core_phi", () => {
    expect(
      legendBucketForSystem({ systemType: "emr", containsPhi: true })
    ).toBe("core_phi");
  });

  it("maps database to storage", () => {
    expect(
      legendBucketForSystem({ systemType: "database", containsPhi: true })
    ).toBe("storage");
  });

  it("maps external communication with PHI to external_gap", () => {
    expect(
      legendBucketForSystem({ systemType: "communication", containsPhi: true })
    ).toBe("external_gap");
  });
});
