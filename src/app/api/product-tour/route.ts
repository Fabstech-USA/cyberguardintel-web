import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";

export const GET = withTenant(async (_req, ctx) => {
  const [member, org] = await Promise.all([
    prisma.orgMember.findUnique({
      where: {
        clerkUserId_organizationId: {
          clerkUserId: ctx.clerkUserId,
          organizationId: ctx.organizationId,
        },
      },
      select: { productTourCompletedAt: true },
    }),
    prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { onboardingStep: true },
    }),
  ]);

  if (!member || !org) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    completed: member.productTourCompletedAt !== null,
    completedAt: member.productTourCompletedAt,
    orgOnboardingComplete: org.onboardingStep === null,
  });
});
