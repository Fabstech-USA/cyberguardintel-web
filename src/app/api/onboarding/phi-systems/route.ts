import { NextResponse } from "next/server";
import { z } from "zod";
import { withTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";

// Keep the preset list authoritative on the server so the client can't
// sneak in arbitrary system types. "other" is a generic catch-all with no
// assumed systemType — we store the free-form name the user provides.
const PRESET_PHI_SYSTEMS = {
  epic_ehr: { name: "Epic EHR", systemType: "emr" },
  athenahealth: { name: "Athenahealth", systemType: "emr" },
  drchrono: { name: "DrChrono", systemType: "emr" },
  aws_rds_s3: { name: "AWS (RDS, S3)", systemType: "database" },
  azure: { name: "Azure", systemType: "cloud" },
  twilio_sms: { name: "Twilio SMS", systemType: "communication" },
  zoom_healthcare: { name: "Zoom for Healthcare", systemType: "communication" },
  other: { name: "Other", systemType: "other" },
} as const;

const PhiSystemsSchema = z.object({
  systems: z
    .array(
      z.enum([
        "epic_ehr",
        "athenahealth",
        "drchrono",
        "aws_rds_s3",
        "azure",
        "twilio_sms",
        "zoom_healthcare",
        "other",
      ])
    )
    .min(1, "Select at least one PHI system"),
});

// Step 3/4 of onboarding. Advances to step 5 (Tech stack).
const NEXT_STEP = 5;

export const POST = withTenant(async (req, ctx) => {
  const body: unknown = await req.json();
  const parsed = PhiSystemsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { systems } = parsed.data;

  // Replace-on-save: clear prior rows so a user who comes back and changes
  // their selection doesn't end up with stale systems.
  await prisma.$transaction([
    prisma.phiSystem.deleteMany({
      where: { organizationId: ctx.organizationId },
    }),
    prisma.phiSystem.createMany({
      data: systems.map((slug) => ({
        organizationId: ctx.organizationId,
        name: PRESET_PHI_SYSTEMS[slug].name,
        systemType: PRESET_PHI_SYSTEMS[slug].systemType,
      })),
    }),
    prisma.organization.update({
      where: { id: ctx.organizationId },
      data: { onboardingStep: NEXT_STEP },
    }),
  ]);

  writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.clerkUserId,
    action: "org.phi_systems_set",
    resourceType: "Organization",
    resourceId: ctx.organizationId,
    metadata: { systems },
  });

  return NextResponse.json({ ok: true });
});
