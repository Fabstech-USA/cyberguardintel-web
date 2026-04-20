import { z } from "zod";
import { withTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit-log";
import { NextResponse } from "next/server";

const FrameworksSchema = z.object({
  frameworkSlugs: z
    .array(z.enum(["HIPAA", "SOC2", "PCI_DSS", "ISO27001", "CMMC"]))
    .min(1, "Select at least one framework"),
});

export const POST = withTenant(async (req, ctx) => {
  const body: unknown = await req.json();
  const parsed = FrameworksSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const frameworks = await prisma.framework.findMany({
    where: { slug: { in: parsed.data.frameworkSlugs } },
  });

  for (const fw of frameworks) {
    await prisma.orgFramework.upsert({
      where: {
        organizationId_frameworkId: {
          organizationId: ctx.organizationId,
          frameworkId: fw.id,
        },
      },
      update: {},
      create: {
        organizationId: ctx.organizationId,
        frameworkId: fw.id,
      },
    });
  }

  await prisma.organization.update({
    where: { id: ctx.organizationId },
    data: { onboardingStep: 3 },
  });

  writeAuditLog({
    organizationId: ctx.organizationId,
    actorId: ctx.clerkUserId,
    action: "org.frameworks_selected",
    resourceType: "OrgFramework",
    metadata: { frameworkSlugs: parsed.data.frameworkSlugs },
  });

  return NextResponse.json({ ok: true });
});
