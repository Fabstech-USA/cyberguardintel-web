import { NextResponse } from "next/server";
import {
  ControlStatus,
  FrameworkSlug,
  type Industry,
  type Prisma,
} from "@/generated/prisma";
import { callAiService } from "@/lib/ai-client";
import {
  AiRiskOutputSchema,
  mapAiOutputToPersistInput,
} from "@/lib/ai-risk-assessment";
import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";
import { withTenant, type TenantContext } from "@/lib/tenant";

const INDUSTRY_LABELS: Record<Industry, string> = {
  HEALTHCARE: "Healthcare",
  TECHNOLOGY: "Technology",
  FINANCE: "Finance",
  ECOMMERCE: "E-commerce",
  OTHER: "Other",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  covered_entity: "Covered Entity",
  business_associate: "Business Associate",
  both: "Covered Entity and Business Associate",
};

const IMPLEMENTED_STATUSES: ControlStatus[] = [
  ControlStatus.IMPLEMENTED,
  ControlStatus.NEEDS_REVIEW,
];

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

  return {
    payload: {
      industry: INDUSTRY_LABELS[organization.industry],
      employee_count: organization.employeeCount ?? 0,
      entity_type: ENTITY_TYPE_LABELS[subjectType] ?? "Covered Entity",
      phi_systems: phiSystemsStr,
      tech_stack: techStackStr,
      existing_controls: existingControlsStr,
    },
    latestVersion: latestRa?.version ?? null,
  };
}

export const POST = withTenant(async (_req, ctx): Promise<Response> => {
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
