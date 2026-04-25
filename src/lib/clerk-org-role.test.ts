import { describe, expect, it, vi } from "vitest";

import { mapClerkRoleToOrgRole } from "@/lib/clerk-org-role";

describe("mapClerkRoleToOrgRole", () => {
  it("maps org:admin to OWNER", () => {
    expect(mapClerkRoleToOrgRole("org:admin")).toBe("OWNER");
  });

  it("maps admin (short) to OWNER", () => {
    expect(mapClerkRoleToOrgRole("admin")).toBe("OWNER");
  });

  it("maps org:member to MEMBER", () => {
    expect(mapClerkRoleToOrgRole("org:member")).toBe("MEMBER");
  });

  it("maps basic_member to MEMBER", () => {
    expect(mapClerkRoleToOrgRole("basic_member")).toBe("MEMBER");
  });

  it("maps org:auditor to AUDITOR", () => {
    expect(mapClerkRoleToOrgRole("org:auditor")).toBe("AUDITOR");
  });

  it("defaults unknown roles to MEMBER and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(mapClerkRoleToOrgRole("org:unknown")).toBe("MEMBER");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("defaults undefined to MEMBER and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(mapClerkRoleToOrgRole(undefined)).toBe("MEMBER");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
