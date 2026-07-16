import { describe, expect, it } from "vitest";
import { OrgRole } from "@/generated/prisma";
import {
  canManageHipaaControls,
  canManageHipaaPolicies,
} from "@/lib/hipaa-policy-access";

describe("canManageHipaaControls", () => {
  it("allows OWNER and ADMIN", () => {
    expect(canManageHipaaControls(OrgRole.OWNER)).toBe(true);
    expect(canManageHipaaControls(OrgRole.ADMIN)).toBe(true);
  });

  it("denies MEMBER and AUDITOR", () => {
    expect(canManageHipaaControls(OrgRole.MEMBER)).toBe(false);
    expect(canManageHipaaControls(OrgRole.AUDITOR)).toBe(false);
  });

  it("matches policy manager gate", () => {
    for (const role of Object.values(OrgRole)) {
      expect(canManageHipaaControls(role)).toBe(canManageHipaaPolicies(role));
    }
  });
});
