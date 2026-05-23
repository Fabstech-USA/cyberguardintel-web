import {
  ControlStatus,
  FrameworkSlug,
  Industry,
} from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import type { AiPolicyOrgSnapshot } from "@/lib/ai-policy-contract";

export * from "@/lib/ai-policy-contract";

const INDUSTRY_LABELS: Record<Industry, string> = {
  HEALTHCARE: "Healthcare",
  TECHNOLOGY: "Technology",
  FINANCE: "Finance",
  ECOMMERCE: "E-commerce",
  OTHER: "Other",
};

const ENTITY_TYPE_LABELS = {
  covered_entity: "Covered Entity",
  business_associate: "Business Associate",
  both: "Covered Entity and Business Associate",
} as const;

type HipaaSubjectKey = keyof typeof ENTITY_TYPE_LABELS;

const IMPLEMENTED_STATUSES: ControlStatus[] = [
  ControlStatus.IMPLEMENTED,
  ControlStatus.NEEDS_REVIEW,
];

/**
 * Loads organization + HIPAA context for policy AI calls (matches risk-assessment wizard data).
 */
export async function loadOrganizationSnapshotForPolicyAi(
  organizationId: string
): Promise<AiPolicyOrgSnapshot | null> {
  const [organization, phiSystems, orgControls] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        industry: true,
        employeeCount: true,
        hipaaSubjectType: true,
        techStack: true,
      },
    }),
    prisma.phiSystem.findMany({
      where: { organizationId },
      select: { name: true },
    }),
    prisma.orgControl.findMany({
      where: {
        organizationId,
        status: { in: IMPLEMENTED_STATUSES },
        frameworkControl: { framework: { slug: FrameworkSlug.HIPAA } },
      },
      select: {
        frameworkControl: { select: { controlRef: true, title: true } },
      },
    }),
  ]);

  if (!organization) return null;

  const phiSystemsStr =
    phiSystems.length > 0
      ? phiSystems.map((p) => p.name).join(", ")
      : "None recorded";
  const existingControlsStr =
    orgControls.length > 0
      ? orgControls
          .map(
            (c) =>
              `${c.frameworkControl.controlRef}: ${c.frameworkControl.title}`
          )
          .join("; ")
      : "None documented";

  const subjectType =
    organization.hipaaSubjectType?.toLowerCase() ?? "covered_entity";
  const entityLabel =
    subjectType === "covered_entity" ||
    subjectType === "business_associate" ||
    subjectType === "both"
      ? ENTITY_TYPE_LABELS[subjectType as HipaaSubjectKey]
      : "Covered Entity";

  return {
    org_name: organization.name,
    industry: INDUSTRY_LABELS[organization.industry],
    employee_count: organization.employeeCount ?? 0,
    entity_type: entityLabel,
    tech_stack:
      organization.techStack.length > 0 ? [...organization.techStack] : [],
    phi_systems: phiSystemsStr,
    existing_controls: existingControlsStr,
  };
}
