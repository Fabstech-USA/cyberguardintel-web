import { OrgRole } from "@/generated/prisma";

const POLICY_MANAGER_ROLES: OrgRole[] = [OrgRole.OWNER, OrgRole.ADMIN];

export function canManageHipaaPolicies(orgRole: string): boolean {
  return POLICY_MANAGER_ROLES.includes(orgRole as OrgRole);
}

/** Owners and admins may approve policies and change status. */
export function canApproveHipaaPolicies(orgRole: string): boolean {
  return canManageHipaaPolicies(orgRole);
}
