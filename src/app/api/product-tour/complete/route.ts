import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";

export const POST = withTenant(async (_req, ctx) => {
  const member = await prisma.orgMember.update({
    where: {
      clerkUserId_organizationId: {
        clerkUserId: ctx.clerkUserId,
        organizationId: ctx.organizationId,
      },
    },
    data: { productTourCompletedAt: new Date() },
    select: { productTourCompletedAt: true },
  });

  return NextResponse.json({
    completed: true,
    completedAt: member.productTourCompletedAt,
  });
});
