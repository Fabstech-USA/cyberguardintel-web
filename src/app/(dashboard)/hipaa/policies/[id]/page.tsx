import { auth } from "@clerk/nextjs/server";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  FrameworkSlug,
  PolicyStatus,
} from "@/generated/prisma";
import { PolicyDetailClient } from "@/components/hipaa/PolicyDetailClient";
import { formatPolicyVersion } from "@/lib/hipaa-policy-version";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { canManageHipaaPolicies } from "@/lib/hipaa-policy-access";
import { getHipaaPolicyCatalog } from "@/lib/hipaa-policy-catalog";
import { getAllowedPolicyTransitions } from "@/lib/hipaa-policy-status";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function HipaaPolicyDetailPage({
  params,
}: PageProps): Promise<React.JSX.Element> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  const { id } = await params;

  const organization = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    select: { id: true },
  });
  if (!organization) {
    redirect("/post-auth");
  }

  const [policy, member] = await Promise.all([
    prisma.policy.findFirst({
      where: {
        id,
        organizationId: organization.id,
        frameworkSlug: FrameworkSlug.HIPAA,
      },
    }),
    prisma.orgMember.findUnique({
      where: {
        clerkUserId_organizationId: {
          clerkUserId: userId,
          organizationId: organization.id,
        },
      },
      select: { role: true },
    }),
  ]);

  if (!policy) {
    notFound();
  }

  const catalogMeta = getHipaaPolicyCatalog().find((e) => e.type === policy.type);
  const canManage = member ? canManageHipaaPolicies(member.role) : false;
  const allowedTransitions = getAllowedPolicyTransitions(policy.status);

  return (
    <div className="flex w-full flex-col gap-6">
      <Link
        href="/hipaa/policies"
        className="text-muted-foreground hover:text-foreground text-sm font-medium"
      >
        ← Policy library
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {catalogMeta?.displayTitle ?? policy.title}
        </h1>
        <p className="text-muted-foreground text-sm">
          {catalogMeta?.cfr ?? ""} · Version {formatPolicyVersion(policy.version)}
        </p>
      </header>

      {policy.status === PolicyStatus.DRAFT && policy.aiGenerated ? (
        <Alert variant="warning">
          <AlertTriangle className="size-5 shrink-0" aria-hidden />
          <AlertTitle>AI-generated draft</AlertTitle>
          <AlertDescription>
            This policy was produced automatically and has not been reviewed by
            your compliance team. Move it to under review when ready, then
            approve after review.
          </AlertDescription>
        </Alert>
      ) : null}

      <PolicyDetailClient
        key={`${policy.id}-detail-v${policy.version}`}
        policy={policy}
        displayTitle={catalogMeta?.displayTitle ?? policy.title}
        allowedTransitions={allowedTransitions}
        canManagePolicies={canManage}
      />
    </div>
  );
}
