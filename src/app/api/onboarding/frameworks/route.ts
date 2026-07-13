import { z } from "zod";
import { ensureOrgControlsForFramework } from "@/lib/ensure-org-framework-controls";
import { FrameworkLimitError } from "@/lib/framework-limits";
import { assertFrameworkCapacity } from "@/lib/framework-limits-server";
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

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { plan: true },
  });
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const frameworks = await prisma.framework.findMany({
    where: { slug: { in: parsed.data.frameworkSlugs } },
  });

  const existing = await prisma.orgFramework.findMany({
    where: {
      organizationId: ctx.organizationId,
      frameworkId: { in: frameworks.map((fw) => fw.id) },
    },
    select: { frameworkId: true },
  });
  const existingIds = new Set(existing.map((row) => row.frameworkId));
  const newFrameworks = frameworks.filter((fw) => !existingIds.has(fw.id));

  try {
    await assertFrameworkCapacity(ctx.organizationId, org.plan, {
      additionalCount: newFrameworks.length,
    });
  } catch (error) {
    if (error instanceof FrameworkLimitError) {
      return NextResponse.json(
        {
          error: error.code,
          used: error.used,
          limit: error.limit,
          plan: error.plan,
        },
        { status: 403 }
      );
    }
    throw error;
  }

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
    if (fw.slug === "HIPAA") {
      await ensureOrgControlsForFramework({
        organizationId: ctx.organizationId,
        frameworkId: fw.id,
        frameworkSlug: "HIPAA",
        actorId: ctx.clerkUserId,
      });
    }
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
