import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";
import {
  ControlStatus,
  FrameworkSlug,
  Industry,
  PolicyStatus,
  type Prisma,
} from "@/generated/prisma";
import { callAiService } from "@/lib/ai-client";
import {
  AiRiskOutputSchema,
  mapAiOutputToPersistInput,
} from "@/lib/ai-risk-assessment";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import {
  WIZARD_CONTROL_IDS,
  WIZARD_CONTROLS,
  type WizardControlId,
} from "@/lib/risk-assessment-controls";
import { withTenant, type TenantContext } from "@/lib/tenant";

const INDUSTRY_LABELS: Record<Industry, string> = {
  HEALTHCARE: "Healthcare",
  TECHNOLOGY: "Technology",
  FINANCE: "Finance",
  ECOMMERCE: "E-commerce",
  OTHER: "Other",
};

const HIPAA_SUBJECT_TYPES = [
  "covered_entity",
  "business_associate",
  "both",
] as const;

const ENTITY_TYPE_LABELS: Record<(typeof HIPAA_SUBJECT_TYPES)[number], string> =
  {
    covered_entity: "Covered Entity",
    business_associate: "Business Associate",
    both: "Covered Entity and Business Associate",
  };

const IMPLEMENTED_STATUSES: ControlStatus[] = [
  ControlStatus.IMPLEMENTED,
  ControlStatus.NEEDS_REVIEW,
];

const ProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    hipaaSubjectType: z.enum(HIPAA_SUBJECT_TYPES).optional(),
    employeeCount: z.number().int().nonnegative().optional(),
    industry: z.nativeEnum(Industry).optional(),
  })
  .optional();

const WizardPayloadSchema = z.object({
  profile: ProfileSchema,
  implementedControlIds: z
    .array(z.enum(WIZARD_CONTROL_IDS as readonly [WizardControlId, ...WizardControlId[]]))
    .max(WIZARD_CONTROL_IDS.length),
});

type OrgContextForAi = {
  industry: string;
  employee_count: number;
  entity_type: string;
  phi_systems: string;
  tech_stack: string;
  existing_controls: string;
};

async function loadOrgContext(
  ctx: TenantContext
): Promise<{ payload: OrgContextForAi; latestVersion: number | null } | null> {
  const [organization, phiSystems, orgControls, latestRa] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: {
        industry: true,
        employeeCount: true,
        hipaaSubjectType: true,
        techStack: true,
      },
    }),
    prisma.phiSystem.findMany({
      where: { organizationId: ctx.organizationId },
      select: { name: true },
    }),
    prisma.orgControl.findMany({
      where: {
        organizationId: ctx.organizationId,
        status: { in: IMPLEMENTED_STATUSES },
        frameworkControl: { framework: { slug: FrameworkSlug.HIPAA } },
      },
      select: {
        frameworkControl: { select: { controlRef: true, title: true } },
      },
    }),
    prisma.riskAssessment.findFirst({
      where: { organizationId: ctx.organizationId },
      orderBy: { version: "desc" },
      select: { version: true },
    }),
  ]);

  if (!organization) return null;

  const phiSystemsStr =
    phiSystems.length > 0
      ? phiSystems.map((p) => p.name).join(", ")
      : "None recorded";
  const techStackStr =
    organization.techStack.length > 0
      ? organization.techStack.join(", ")
      : "Not specified";
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
      ? ENTITY_TYPE_LABELS[subjectType]
      : "Covered Entity";

  return {
    payload: {
      industry: INDUSTRY_LABELS[organization.industry],
      employee_count: organization.employeeCount ?? 0,
      entity_type: entityLabel,
      phi_systems: phiSystemsStr,
      tech_stack: techStackStr,
      existing_controls: existingControlsStr,
    },
    latestVersion: latestRa?.version ?? null,
  };
}

async function applyProfileWritethrough(
  ctx: TenantContext,
  profile: NonNullable<z.infer<typeof ProfileSchema>>
): Promise<void> {
  const data: Prisma.OrganizationUpdateInput = {};
  if (profile.name !== undefined) data.name = profile.name;
  if (profile.hipaaSubjectType !== undefined)
    data.hipaaSubjectType = profile.hipaaSubjectType;
  if (profile.employeeCount !== undefined)
    data.employeeCount = profile.employeeCount;
  if (profile.industry !== undefined) data.industry = profile.industry;
  if (Object.keys(data).length === 0) return;

  // Read the prior name+clerkOrgId so we can mirror name changes to Clerk
  // and keep the Clerk-driven org switcher in sync with Prisma.
  const before = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { name: true, clerkOrgId: true },
  });

  await prisma.organization.update({
    where: { id: ctx.organizationId },
    data,
  });

  if (
    profile.name !== undefined &&
    before &&
    profile.name !== before.name
  ) {
    const clerk = await clerkClient();
    await clerk.organizations.updateOrganization(before.clerkOrgId, {
      name: profile.name,
    });
  }
}

async function mirrorImplementedControls(
  ctx: TenantContext,
  implementedControlIds: WizardControlId[]
): Promise<void> {
  // We only ever upgrade to IMPLEMENTED; unchecked items are left as-is so we
  // don't accidentally regress controls implemented through other flows.
  const implementedRefs = WIZARD_CONTROLS.filter((c) =>
    implementedControlIds.includes(c.id)
  ).map((c) => c.controlRef);
  if (implementedRefs.length === 0) return;
  await prisma.orgControl.updateMany({
    where: {
      organizationId: ctx.organizationId,
      frameworkControl: {
        controlRef: { in: implementedRefs },
        framework: { slug: FrameworkSlug.HIPAA },
      },
    },
    data: {
      status: ControlStatus.IMPLEMENTED,
      lastReviewedAt: new Date(),
    },
  });
}

export const GET = withTenant(async (_req, ctx): Promise<Response> => {
  const ra = await prisma.riskAssessment.findFirst({
    where: {
      organizationId: ctx.organizationId,
      status: { not: PolicyStatus.ARCHIVED },
    },
    orderBy: { version: "desc" },
  });
  return NextResponse.json(ra ?? null);
});

export const POST = withTenant(async (req, ctx): Promise<Response> => {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsedBody = WizardPayloadSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: "Invalid wizard payload",
        details: parsedBody.error.flatten(),
      },
      { status: 400 }
    );
  }

  const { profile, implementedControlIds } = parsedBody.data;

  if (profile) {
    await applyProfileWritethrough(ctx, profile);
  }
  await mirrorImplementedControls(ctx, implementedControlIds);

  const loaded = await loadOrgContext(ctx);
  if (!loaded) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  const { payload, latestVersion } = loaded;

  // Call the AI service via the shared client. This goes through the same
  // X-Internal-Key flow as the /api/ai/risk-assessment thin proxy; we skip
  // the extra HTTP hop here for latency, but the proxy remains available
  // for direct callers and future streaming.
  let raw: unknown;
  try {
    raw = await callAiService("/hipaa/risk-assessment", payload);
  } catch (err) {
    console.error("AI risk-assessment call failed", err);
    return NextResponse.json(
      { error: "AI service unavailable" },
      { status: 502 }
    );
  }

  const parsed = AiRiskOutputSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(
      "AI risk-assessment response invalid",
      parsed.error.flatten()
    );
    return NextResponse.json({ error: "Invalid AI response" }, { status: 502 });
  }

  const persistInput = mapAiOutputToPersistInput(parsed.data);

  const ra = await prisma.riskAssessment.create({
    data: {
      organizationId: ctx.organizationId,
      conductedById: ctx.clerkUserId,
      version: (latestVersion ?? 0) + 1,
      scope: persistInput.scope,
      threats: persistInput.threats as Prisma.InputJsonValue,
      vulnerabilities: persistInput.vulnerabilities as Prisma.InputJsonValue,
      riskLevel: persistInput.riskLevel,
      recommendations: persistInput.recommendations as Prisma.InputJsonValue,
      aiGenerated: true,
    },
  });

  writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.clerkUserId,
    action: "risk_assessment.created",
    resourceType: "RiskAssessment",
    resourceId: ra.id,
    metadata: {
      version: ra.version,
      riskLevel: ra.riskLevel,
      aiGenerated: true,
    },
  });

  return NextResponse.json(ra, { status: 201 });
});
