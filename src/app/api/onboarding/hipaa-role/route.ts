import { NextResponse } from "next/server";
import { z } from "zod";
import { withTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";

const HipaaRoleSchema = z.object({
  hipaaSubjectType: z.enum(["covered_entity", "business_associate", "both"]),
});

// Step 2/4 of the new onboarding flow. Advances the org to step 4 (PHI systems).
const NEXT_STEP = 4;

export const POST = withTenant(async (req, ctx) => {
  const body: unknown = await req.json();
  const parsed = HipaaRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { hipaaSubjectType } = parsed.data;

  await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: {
      hipaaSubjectType,
      onboardingStep: NEXT_STEP,
    },
  });

  writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.clerkUserId,
    action: "org.hipaa_role_set",
    resourceType: "Organization",
    resourceId: ctx.organizationId,
    metadata: { hipaaSubjectType },
  });

  return NextResponse.json({ ok: true });
});
