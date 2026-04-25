import { FrameworkSlug } from "@/generated/prisma";
import { ensureOrgControlsForFramework } from "@/lib/ensure-org-framework-controls";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";

/** Full HIPAA control set is small; no pagination. */
export const GET = withTenant(async (_req, ctx) => {
  const framework = await prisma.framework.findUnique({
    where: { slug: FrameworkSlug.HIPAA },
    select: {
      id: true,
      slug: true,
      name: true,
      version: true,
      description: true,
      isActive: true,
    },
  });

  if (!framework) {
    return Response.json({ error: "Framework not found" }, { status: 404 });
  }

  await prisma.orgFramework.upsert({
    where: {
      organizationId_frameworkId: {
        organizationId: ctx.organizationId,
        frameworkId: framework.id,
      },
    },
    update: {},
    create: {
      organizationId: ctx.organizationId,
      frameworkId: framework.id,
    },
  });

  await ensureOrgControlsForFramework({
    organizationId: ctx.organizationId,
    frameworkId: framework.id,
    frameworkSlug: "HIPAA",
  });

  const frameworkControls = await prisma.frameworkControl.findMany({
    where: { frameworkId: framework.id },
    select: {
      id: true,
      frameworkId: true,
      controlRef: true,
      category: true,
      title: true,
      description: true,
      guidance: true,
      evidenceHints: true,
      isRequired: true,
    },
    orderBy: [{ category: "asc" }, { controlRef: "asc" }],
  });

  const controlIds = frameworkControls.map((c) => c.id);

  const orgControls = await prisma.orgControl.findMany({
    where: {
      organizationId: ctx.organizationId,
      frameworkControlId: { in: controlIds },
    },
  });

  const orgByFrameworkControlId = new Map(
    orgControls.map((oc) => [oc.frameworkControlId, oc])
  );

  const controls = [];
  for (const control of frameworkControls) {
    const orgControl = orgByFrameworkControlId.get(control.id);
    if (!orgControl) {
      return Response.json(
        {
          error: "Internal error",
          detail: `Missing OrgControl for frameworkControlId=${control.id} after ensure`,
        },
        { status: 500 }
      );
    }
    controls.push({ control, orgControl });
  }

  return Response.json({ framework, controls });
});
