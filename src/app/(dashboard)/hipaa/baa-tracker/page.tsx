import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { BaaTable } from "@/components/hipaa/BaaTable";
import { canMutateBaa } from "@/lib/baa";
import { loadBaaTrackerBundle } from "@/lib/baa-server";
import { ensureOrganizationSyncedFromClerk } from "@/lib/clerk-webhook-sync";
import { prisma } from "@/lib/prisma";

function normalizeHipaaEntityType(raw: string | null): string {
  const value = raw?.toLowerCase();
  if (value === "business_associate") return "Business Associate";
  if (value === "both") return "Covered Entity and Business Associate";
  return "Covered Entity";
}

export default async function Page(): Promise<React.JSX.Element> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  let organization = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    select: {
      id: true,
      name: true,
      hipaaSubjectType: true,
    },
  });

  if (!organization) {
    await ensureOrganizationSyncedFromClerk(orgId);
    organization = await prisma.organization.findUnique({
      where: { clerkOrgId: orgId },
      select: {
        id: true,
        name: true,
        hipaaSubjectType: true,
      },
    });
  }

  if (!organization) {
    redirect("/post-auth");
  }

  const member = await prisma.orgMember.findUnique({
    where: {
      clerkUserId_organizationId: {
        clerkUserId: userId,
        organizationId: organization.id,
      },
    },
    select: { role: true },
  });

  if (!member) {
    redirect("/post-auth");
  }

  const bundle = await loadBaaTrackerBundle(organization.id);

  return (
    <BaaTable
      initialBundle={bundle}
      organizationName={organization.name}
      hipaaEntityType={normalizeHipaaEntityType(organization.hipaaSubjectType)}
      canMutate={canMutateBaa(member.role)}
    />
  );
}

