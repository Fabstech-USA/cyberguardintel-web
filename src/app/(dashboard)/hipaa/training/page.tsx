import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { TrainingRecordsClient } from "@/components/hipaa/TrainingRecordsClient";
import { canMutateTraining } from "@/lib/training";
import { loadTrainingBundle } from "@/lib/training-server";
import { ensureOrganizationSyncedFromClerk } from "@/lib/clerk-webhook-sync";
import { prisma } from "@/lib/prisma";

export default async function Page(): Promise<React.JSX.Element> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  let organization = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    select: { id: true },
  });

  if (!organization) {
    await ensureOrganizationSyncedFromClerk(orgId);
    organization = await prisma.organization.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true },
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

  const bundle = await loadTrainingBundle(organization.id, orgId);

  return (
    <TrainingRecordsClient
      bundle={bundle}
      canMutate={canMutateTraining(member.role)}
    />
  );
}
