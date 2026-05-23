import { NextResponse } from "next/server";
import { FrameworkSlug } from "@/generated/prisma";
import {
  countBaaLinkedEvidence,
  ensureBaaEvidenceSynced,
} from "@/lib/baa-evidence-sync";
import { recalculateHipaaScore } from "@/lib/hipaa-scoring";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";

export const GET = withTenant(async (_req, ctx) => {
  const framework = await prisma.framework.findUnique({
    where: { slug: FrameworkSlug.HIPAA },
    select: { id: true },
  });

  if (!framework) {
    return NextResponse.json({ score: 0, scoreUpdatedAt: null });
  }

  const [baaCount, linkedEvidence] = await Promise.all([
    prisma.baaRecord.count({ where: { organizationId: ctx.organizationId } }),
    countBaaLinkedEvidence(ctx.organizationId),
  ]);

  if (baaCount !== linkedEvidence) {
    await ensureBaaEvidenceSynced(ctx.organizationId);
    await recalculateHipaaScore(ctx.organizationId);
  }

  const orgFramework = await prisma.orgFramework.findUnique({
    where: {
      organizationId_frameworkId: {
        organizationId: ctx.organizationId,
        frameworkId: framework.id,
      },
    },
    select: { score: true, scoreUpdatedAt: true },
  });

  return NextResponse.json({
    score: orgFramework?.score ?? 0,
    scoreUpdatedAt: orgFramework?.scoreUpdatedAt?.toISOString() ?? null,
  });
});
