import { NextResponse } from "next/server";
import {
  countBaaLinkedEvidence,
  ensureBaaEvidenceSynced,
} from "@/lib/baa-evidence-sync";
import { loadHipaaOverviewSnapshot } from "@/lib/hipaa-overview-snapshot";
import { recalculateHipaaScore } from "@/lib/hipaa-scoring";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";

export const GET = withTenant(async (_req, ctx) => {
  const [baaCount, linkedEvidence] = await Promise.all([
    prisma.baaRecord.count({ where: { organizationId: ctx.organizationId } }),
    countBaaLinkedEvidence(ctx.organizationId),
  ]);

  if (baaCount !== linkedEvidence) {
    await ensureBaaEvidenceSynced(ctx.organizationId);
    await recalculateHipaaScore(ctx.organizationId);
  }

  const snapshot = await loadHipaaOverviewSnapshot(ctx.organizationId);
  return NextResponse.json(snapshot);
});
