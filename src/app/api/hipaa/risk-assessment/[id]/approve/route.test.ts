import { describe, expect, it } from "vitest";
import { OrgRole } from "@/generated/prisma";

// Mirrors the predicate exported from route.ts. We redefine here to avoid
// pulling Clerk SDK + Prisma into the test runtime (same pattern as
// src/app/api/onboarding/phi-systems/route.test.ts).
const APPROVER_ROLES: OrgRole[] = [OrgRole.OWNER, OrgRole.ADMIN];
function canApproveRisk(role: string): boolean {
  return APPROVER_ROLES.includes(role as OrgRole);
}

describe("canApproveRisk role gate", () => {
  it("allows OWNER", () => {
    expect(canApproveRisk(OrgRole.OWNER)).toBe(true);
  });

  it("allows ADMIN", () => {
    expect(canApproveRisk(OrgRole.ADMIN)).toBe(true);
  });

  it("denies MEMBER", () => {
    expect(canApproveRisk(OrgRole.MEMBER)).toBe(false);
  });

  it("denies AUDITOR", () => {
    expect(canApproveRisk(OrgRole.AUDITOR)).toBe(false);
  });

  it("denies arbitrary string roles", () => {
    expect(canApproveRisk("VIEWER")).toBe(false);
    expect(canApproveRisk("")).toBe(false);
  });
});
