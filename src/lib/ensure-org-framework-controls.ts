import { writeAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/prisma";

/**
 * Ensures an enrolled org has one OrgControl row per FrameworkControl for the framework.
 * Idempotent: uses createMany with skipDuplicates.
 */
export async function ensureOrgControlsForFramework(params: {
  organizationId: string;
  frameworkId: string;
  frameworkSlug: string;
  /** When set, a single audit entry is written if new rows were created. */
  actorId?: string;
}): Promise<number> {
  const { organizationId, frameworkId, frameworkSlug, actorId } = params;

  const controls = await prisma.frameworkControl.findMany({
    where: { frameworkId },
    select: { id: true },
  });
  if (controls.length === 0) {
    return 0;
  }

  const result = await prisma.orgControl.createMany({
    data: controls.map((c) => ({
      organizationId,
      frameworkControlId: c.id,
    })),
    skipDuplicates: true,
  });

  if (result.count > 0 && actorId) {
    writeAuditLog({
      organizationId,
      actorId,
      action: "org.framework_controls_synced",
      resourceType: "OrgControl",
      metadata: { frameworkSlug, created: result.count },
    });
  }

  return result.count;
}
