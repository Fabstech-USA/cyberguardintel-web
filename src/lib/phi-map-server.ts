import { PhiFlowDataClassification } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import {
  edgeBaaCompliant,
  edgeIsPhiGap,
  legendBucketForSystem,
} from "@/lib/phi-map";

export type PhiMapBundle = Awaited<ReturnType<typeof loadPhiMapBundle>>;

export async function loadPhiMapBundle(organizationId: string) {
  const now = new Date();

  const [systems, integrations, edges, baaRecords] = await Promise.all([
    prisma.phiSystem.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      include: {
        baaRecord: {
          select: { id: true, status: true, expiresAt: true, vendorName: true },
        },
      },
    }),
    prisma.integration.findMany({
      where: { organizationId },
      select: {
        id: true,
        displayName: true,
        type: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.phiFlowEdge.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      include: {
        baaRecord: {
          select: { id: true, status: true, expiresAt: true, vendorName: true },
        },
        sourcePhiSystem: { select: { id: true, name: true } },
        targetPhiSystem: { select: { id: true, name: true } },
        targetIntegration: {
          select: { id: true, displayName: true, type: true },
        },
        viaIntegration: {
          select: { id: true, displayName: true, type: true },
        },
      },
    }),
    prisma.baaRecord.findMany({
      where: { organizationId },
      select: {
        id: true,
        vendorName: true,
        status: true,
        expiresAt: true,
      },
      orderBy: { vendorName: "asc" },
    }),
  ]);

  const serializedEdges = edges.map((e) => {
    const baaCompliant = edgeBaaCompliant(
      {
        isExternalVendorFlow: e.isExternalVendorFlow,
        dataClassification: e.dataClassification,
        baaRecord: e.baaRecord,
      },
      now
    );
    const isPhiGap = edgeIsPhiGap(
      {
        isExternalVendorFlow: e.isExternalVendorFlow,
        dataClassification: e.dataClassification,
        baaRecord: e.baaRecord,
      },
      now
    );
    return {
      id: e.id,
      organizationId: e.organizationId,
      sourcePhiSystemId: e.sourcePhiSystemId,
      targetPhiSystemId: e.targetPhiSystemId,
      targetIntegrationId: e.targetIntegrationId,
      viaIntegrationId: e.viaIntegrationId,
      baaRecordId: e.baaRecordId,
      isExternalVendorFlow: e.isExternalVendorFlow,
      dataClassification: e.dataClassification,
      baaCompliant,
      isPhiGap,
      baa: e.baaRecord,
      sourcePhiSystem: e.sourcePhiSystem,
      targetPhiSystem: e.targetPhiSystem,
      targetIntegration: e.targetIntegration,
      viaIntegration: e.viaIntegration,
    };
  });

  const phiGapSummaries = serializedEdges
    .filter((e) => e.isPhiGap)
    .map((e) => ({
      edgeId: e.id,
      targetLabel:
        e.targetPhiSystem?.name ??
        e.targetIntegration?.displayName ??
        "External flow",
      reason:
        e.dataClassification === PhiFlowDataClassification.PHI
          ? "PHI disclosed without an active signed BAA."
          : "",
    }));

  return {
    meta: { serverTime: now.toISOString() },
    systems: systems.map((s) => ({
      ...s,
      legendBucket: legendBucketForSystem({
        systemType: s.systemType,
        containsPhi: s.containsPhi,
      }),
    })),
    integrations,
    baaRecords,
    edges: serializedEdges,
    phiGapSummaries,
    phiGapCount: phiGapSummaries.length,
  };
}
