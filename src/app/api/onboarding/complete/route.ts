import { withTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { NextResponse } from "next/server";

export const POST = withTenant(async (_req, ctx) => {
  await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: { onboardingStep: null },
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
