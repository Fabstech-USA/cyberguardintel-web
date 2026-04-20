import { NextResponse } from "next/server";
import { z } from "zod";
import { withTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";

// Server-side allow-list mirrors the TechStackStep preset grid. Keeps the
// Organization.techStack column free of arbitrary values.
const TECH_STACK_VALUES = [
  "aws",
  "google_cloud",
  "azure",
  "google_workspace",
  "microsoft_365",
  "github",
  "okta",
  "slack",
] as const;

const TechStackSchema = z.object({
  techStack: z.array(z.enum(TECH_STACK_VALUES)),
});

// Final onboarding step. Setting onboardingStep to null means "done" and
// routes the user to the dashboard on the next /onboarding hit.
const STEP_COMPLETE = null;

export const POST = withTenant(async (req, ctx) => {
  const body: unknown = await req.json();
  const parsed = TechStackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { techStack } = parsed.data;

  await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: {
      techStack,
      onboardingStep: STEP_COMPLETE,
    },
  });

  writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.clerkUserId,
    action: "org.tech_stack_set",
    resourceType: "Organization",
    resourceId: ctx.organizationId,
    metadata: { techStack },
  });

  writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.clerkUserId,
    action: "org.onboarding_completed",
    resourceType: "Organization",
    resourceId: ctx.organizationId,
  });

  return NextResponse.json({ ok: true });
});
