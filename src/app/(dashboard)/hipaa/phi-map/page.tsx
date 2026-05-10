import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PhiMapClient } from "@/components/hipaa/PhiMapClient";
import { OrgRole } from "@/generated/prisma";
import { loadPhiMapBundle } from "@/lib/phi-map-server";
import { prisma } from "@/lib/prisma";

export default async function PhiMapPage(): Promise<React.JSX.Element> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  const organization = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    select: { id: true },
  });
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
    redirect("/sign-in");
  }

  const bundle = await loadPhiMapBundle(organization.id);
  const canMutate = member.role !== OrgRole.AUDITOR;

  return <PhiMapClient initialBundle={bundle} canMutate={canMutate} />;
}
