import type { OrgRole } from "@/generated/prisma";

/**
 * Maps Clerk organization membership `role` to Prisma `OrgRole`.
 * Clerk uses keys like `org:admin` and `org:member`.
 */
export function mapClerkRoleToOrgRole(clerkRole: string | undefined): OrgRole {
  const r = (clerkRole ?? "").toLowerCase();
  if (r === "org:admin" || r === "admin") {
    return "OWNER";
  }
  if (r === "org:member" || r === "member" || r === "basic_member") {
    return "MEMBER";
  }
  if (r === "org:auditor" || r === "auditor") {
    return "AUDITOR";
  }
  console.warn(`clerk webhook: unknown organization role "${clerkRole}", defaulting to MEMBER`);
  return "MEMBER";
}
