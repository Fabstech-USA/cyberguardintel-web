import { describe, expect, it } from "vitest";
import { PolicyStatus, PolicyType } from "@/generated/prisma";
import {
  appendCitationsToContent,
  AiGeneratePolicyRequestSchema,
  AiPolicyOrgSnapshotSchema,
  buildGeneratePolicyPayload,
} from "@/lib/ai-policy-contract";
import {
  mergePoliciesWithCatalog,
  filterMergedRows,
  summarizePolicyRows,
  HIPAA_POLICY_TARGET,
} from "@/lib/hipaa-policy-catalog";

describe("mergePoliciesWithCatalog", () => {
  it("returns 12 rows with NOT_STARTED when DB empty", () => {
    const merged = mergePoliciesWithCatalog([]);
    expect(merged).toHaveLength(HIPAA_POLICY_TARGET);
    expect(merged.every((r) => r.status === "NOT_STARTED")).toBe(true);
  });

  it("maps stored policy fields", () => {
    const merged = mergePoliciesWithCatalog([
      {
        id: "p1",
        type: PolicyType.ACCESS_CONTROL,
        title: "Custom title",
        status: PolicyStatus.APPROVED,
        version: 2,
        updatedAt: new Date("2026-03-14T12:00:00Z"),
        reviewDate: null,
        aiGenerated: false,
      },
    ]);
    const row = merged.find((r) => r.type === PolicyType.ACCESS_CONTROL)!;
    expect(row.status).toBe(PolicyStatus.APPROVED);
    expect(row.id).toBe("p1");
    expect(row.versionLabel).toBe("v2");
    expect(row.storedTitle).toBe("Custom title");
  });
});

describe("filterMergedRows", () => {
  it("filters by safeguard bucket", () => {
    const merged = mergePoliciesWithCatalog([]);
    const technical = filterMergedRows(merged, { safeguard: "Technical" });
    expect(technical.every((r) => r.safeguard === "Technical")).toBe(true);
    expect(technical.length).toBeGreaterThan(0);
  });
});

describe("summarizePolicyRows", () => {
  it("counts buckets", () => {
    const merged = mergePoliciesWithCatalog([]);
    merged[0] = { ...merged[0], status: PolicyStatus.APPROVED };
    merged[1] = { ...merged[1], status: PolicyStatus.DRAFT };
    const s = summarizePolicyRows(merged);
    expect(s.approved).toBe(1);
    expect(s.draft).toBe(1);
    expect(s.notStarted).toBe(HIPAA_POLICY_TARGET - 2);
  });
});

describe("AiGeneratePolicyRequestSchema", () => {
  const snapshot = {
    org_name: "Acme",
    industry: "Healthcare",
    employee_count: 10,
    entity_type: "Covered Entity",
    tech_stack: ["aws"],
    phi_systems: "EHR",
    existing_controls: "MFA",
  };

  it("accepts merged FastAPI payload", () => {
    const merged = buildGeneratePolicyPayload(
      snapshot,
      PolicyType.AUDIT_CONTROLS
    );
    const result = AiGeneratePolicyRequestSchema.safeParse(merged);
    expect(result.success).toBe(true);
  });

  it("accepts org snapshot alone", () => {
    const result = AiPolicyOrgSnapshotSchema.safeParse(snapshot);
    expect(result.success).toBe(true);
  });
});

describe("appendCitationsToContent", () => {
  it("appends references section", () => {
    const out = appendCitationsToContent("# Title", ["45 CFR 164.312(a)(1)"]);
    expect(out).toContain("Regulatory references");
    expect(out).toContain("164.312(a)(1)");
  });
});
