import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  ControlStatus,
  FrameworkSlug,
  Industry,
  OrgRole,
  PolicyStatus,
} from "@/generated/prisma";
import { RiskAssessmentClient } from "@/components/hipaa/RiskAssessmentClient";
import type {
  HipaaSubjectType,
  WizardPhiSystem,
  WizardProfile,
} from "@/components/hipaa/risk-assessment-wizard/types";
import { prisma } from "@/lib/prisma";
import {
  WIZARD_CONTROLS,
  type WizardControlId,
} from "@/lib/risk-assessment-controls";

const APPROVER_ROLES: OrgRole[] = [OrgRole.OWNER, OrgRole.ADMIN];
const HIPAA_SUBJECT_TYPES: ReadonlySet<HipaaSubjectType> = new Set([
  "covered_entity",
  "business_associate",
  "both",
]);

function normalizeSubjectType(raw: string | null): HipaaSubjectType {
  const lower = raw?.toLowerCase();
  if (lower && HIPAA_SUBJECT_TYPES.has(lower as HipaaSubjectType)) {
    return lower as HipaaSubjectType;
  }
  return "covered_entity";
}

export default async function RiskAssessmentPage(): Promise<React.JSX.Element> {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    redirect("/sign-in");
  }

  const organization = await prisma.organization.findUnique({
    where: { clerkOrgId: orgId },
    select: {
      id: true,
      name: true,
      industry: true,
      employeeCount: true,
      hipaaSubjectType: true,
    },
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
  const canApprove = member ? APPROVER_ROLES.includes(member.role) : false;

  const [latestAssessment, phiSystems, implementedHipaaControls] =
    await Promise.all([
      prisma.riskAssessment.findFirst({
        where: {
          organizationId: organization.id,
          status: { not: PolicyStatus.ARCHIVED },
        },
        orderBy: { version: "desc" },
      }),
      prisma.phiSystem.findMany({
        where: { organizationId: organization.id },
        select: { name: true, description: true, systemType: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.orgControl.findMany({
        where: {
          organizationId: organization.id,
          status: { in: [ControlStatus.IMPLEMENTED, ControlStatus.NEEDS_REVIEW] },
          frameworkControl: { framework: { slug: FrameworkSlug.HIPAA } },
        },
        select: {
          frameworkControl: { select: { controlRef: true } },
        },
      }),
    ]);

  const refToWizardId = new Map(WIZARD_CONTROLS.map((c) => [c.controlRef, c.id]));
  const initialImplementedControlIds: WizardControlId[] = [];
  const seen = new Set<WizardControlId>();
  for (const oc of implementedHipaaControls) {
    const wizardId = refToWizardId.get(oc.frameworkControl.controlRef);
    if (wizardId && !seen.has(wizardId)) {
      initialImplementedControlIds.push(wizardId);
      seen.add(wizardId);
    }
  }

  const initialProfile: WizardProfile = {
    name: organization.name,
    hipaaSubjectType: normalizeSubjectType(organization.hipaaSubjectType),
    employeeCount: organization.employeeCount,
    industry: organization.industry as Industry,
  };

  const initialPhiSystems: WizardPhiSystem[] = phiSystems.map((p) => ({
    name: p.name,
    description: p.description,
    systemType: p.systemType,
  }));

  // Resolve the approver's display name for the result view header.
  let approvedByName: string | null = null;
  if (latestAssessment?.approvedById) {
    try {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(latestAssessment.approvedById);
      approvedByName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        user.emailAddresses[0]?.emailAddress ||
        null;
    } catch {
      approvedByName = null;
    }
  }

  return (
    <RiskAssessmentClient
      initialAssessment={latestAssessment}
      approvedByName={approvedByName}
      organizationName={organization.name}
      initialProfile={initialProfile}
      initialPhiSystems={initialPhiSystems}
      initialImplementedControlIds={initialImplementedControlIds}
      canApprove={canApprove}
    />
  );
}
