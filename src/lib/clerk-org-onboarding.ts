import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

/**
 * Clerk roles treated as “org builders” when we don’t yet have a Prisma row.
 * (Matches org:admin covering both OWNER and ADMIN in our Clerk mapping.)
 */
const ORG_SETUP_CLERK_ROLES = new Set(["org:admin", "admin"]);

/**
 * True when this user should see the **organization** onboarding wizard for the
 * active Clerk org (plan, org details, HIPAA setup). Invited **members** and
 * **auditors** should use the app while admins finish setup.
 *
 * Prefers Prisma `OrgMember` (webhook-synced); falls back to Clerk if the row
 * is not there yet.
 */
export async function userShouldRunOrgOnboardingWizard(
  userId: string,
  clerkOrgId: string,
): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { clerkOrgId },
    select: { id: true },
  });

  if (org) {
    const member = await prisma.orgMember.findUnique({
      where: {
        clerkUserId_organizationId: {
          clerkUserId: userId,
          organizationId: org.id,
        },
      },
      select: { role: true },
    });
    if (member) {
      return member.role === "OWNER" || member.role === "ADMIN";
    }
  }

  const clerk = await clerkClient();
  const list = await clerk.users.getOrganizationMembershipList({
    userId,
    limit: 100,
  });

  const row = list.data?.find((m) => m.organization.id === clerkOrgId);
  if (!row) {
    // No membership visible yet; safer to send admins through setup than to hide it.
    return true;
  }

  const r = (row.role ?? "").toLowerCase();
  return ORG_SETUP_CLERK_ROLES.has(r);
}
