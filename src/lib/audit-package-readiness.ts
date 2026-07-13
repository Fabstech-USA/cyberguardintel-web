import { BaaStatus, PolicyStatus } from "@/generated/prisma";
import { buildEvidenceWhere } from "@/lib/evidence-list-filters";
import {
  AUDIT_PACKAGE_SECTION_IDS,
  AUDIT_PACKAGE_SECTION_LABELS,
  type AuditPackageSectionId,
} from "@/lib/audit-package-sections";
import { prisma } from "@/lib/prisma";

export type ReadinessState = "ok" | "partial" | "danger";

export type ReadinessSection = {
  id: AuditPackageSectionId;
  label: string;
  state: ReadinessState;
  /** Short label for checklist rows (e.g. "4 systems"). */
  count: string;
  /** Longer detail for sidebar / recommendations. */
  reason: string;
  /** PHI flow map: total systems on the map. */
  systemCount?: number;
  /** PHI flow map: total flow edges. */
  edgeCount?: number;
};

export type AuditPackageReadiness = {
  sections: ReadinessSection[];
  percentReady: number;
};

type Scored = Omit<ReadinessSection, "id" | "label">;

export function computePercentReady(sections: ReadinessSection[]): number {
  if (sections.length === 0) return 0;
  const score = sections.reduce((sum, s) => {
    if (s.state === "ok") return sum + 1;
    if (s.state === "partial") return sum + 0.5;
    return sum;
  }, 0);
  return Math.round((score / sections.length) * 100);
}

export function scoreEvidenceReadiness(params: {
  total: number;
  withS3: number;
}): Scored {
  if (params.total === 0) {
    return {
      state: "danger",
      count: "0 files",
      reason: "No evidence in this date range",
    };
  }
  if (params.withS3 === 0) {
    return {
      state: "partial",
      count: `${params.total} items`,
      reason: `${params.total} evidence row(s) but none have downloadable files`,
    };
  }
  if (params.withS3 < params.total) {
    return {
      state: "partial",
      count: `${params.withS3} of ${params.total} files`,
      reason: `${params.withS3} of ${params.total} evidence files ready`,
    };
  }
  return {
    state: "ok",
    count: `${params.withS3} files`,
    reason: `${params.withS3} evidence file(s) ready`,
  };
}

export function scorePoliciesReadiness(params: {
  approvedCount: number;
  approvedWithPdf: number;
}): Scored {
  if (params.approvedCount === 0) {
    return {
      state: "danger",
      count: "0 approved",
      reason: "No approved policies",
    };
  }
  if (params.approvedWithPdf === 0) {
    return {
      state: "partial",
      count: `${params.approvedCount} approved`,
      reason: `${params.approvedCount} approved but missing PDF files`,
    };
  }
  if (params.approvedWithPdf < params.approvedCount) {
    return {
      state: "partial",
      count: `${params.approvedWithPdf} of ${params.approvedCount}`,
      reason: `${params.approvedWithPdf} of ${params.approvedCount} approved policies have PDFs`,
    };
  }
  return {
    state: "ok",
    count: `${params.approvedWithPdf} approved`,
    reason: `${params.approvedWithPdf} approved policy PDF(s)`,
  };
}

export function scoreRiskReadiness(params: {
  hasApproved: boolean;
  version?: number | null;
}): Scored {
  if (!params.hasApproved) {
    return {
      state: "danger",
      count: "Not approved",
      reason: "No approved risk assessment",
    };
  }
  const ver =
    params.version != null ? `v${params.version}` : "Approved";
  return {
    state: "ok",
    count: ver,
    reason: "Approved risk assessment available",
  };
}

export function scoreBaaReadiness(params: {
  total: number;
  signed: number;
  expired: number;
  pending: number;
}): Scored {
  if (params.total === 0) {
    return { state: "danger", count: "0 records", reason: "No BAA records" };
  }
  if (params.signed > 0 && params.expired === 0 && params.pending === 0) {
    return {
      state: "ok",
      count: `${params.signed} signed`,
      reason: `${params.signed} signed BAA(s)`,
    };
  }
  if (params.signed > 0) {
    return {
      state: "partial",
      count: `${params.signed} signed`,
      reason: `${params.signed} signed; ${params.pending} pending; ${params.expired} expired`,
    };
  }
  return {
    state: "danger",
    count: "None signed",
    reason: "No signed BAAs (only pending/expired/other)",
  };
}

export function scoreTrainingReadiness(params: {
  total: number;
  overdue: number;
}): Scored {
  if (params.total === 0) {
    return {
      state: "danger",
      count: "0 records",
      reason: "No training records",
    };
  }
  if (params.overdue > 0) {
    return {
      state: "partial",
      count: `${params.total} records`,
      reason: `${params.total} record(s), ${params.overdue} overdue`,
    };
  }
  return {
    state: "ok",
    count: `${params.total} records`,
    reason: `${params.total} training record(s), none overdue`,
  };
}

export function scoreAuditLogReadiness(count: number): Scored {
  if (count === 0) {
    return {
      state: "danger",
      count: "0 entries",
      reason: "No audit log entries in this date range",
    };
  }
  return {
    state: "ok",
    count: `${count.toLocaleString()} entries`,
    reason: `${count} audit log entr${count === 1 ? "y" : "ies"}`,
  };
}

export function scorePhiMapReadiness(params: {
  systemCount: number;
  edgeCount: number;
}): Scored {
  const systemsLabel = `${params.systemCount} system${
    params.systemCount === 1 ? "" : "s"
  }`;

  if (params.systemCount === 0) {
    return {
      state: "danger",
      count: systemsLabel,
      reason: "No PHI systems mapped",
      systemCount: 0,
      edgeCount: params.edgeCount,
    };
  }
  if (params.edgeCount === 0) {
    return {
      state: "partial",
      count: systemsLabel,
      reason: `${systemsLabel}, no flow edges yet`,
      systemCount: params.systemCount,
      edgeCount: 0,
    };
  }
  return {
    state: "ok",
    count: systemsLabel,
    reason: `${systemsLabel}, ${params.edgeCount} flow${
      params.edgeCount === 1 ? "" : "s"
    }`,
    systemCount: params.systemCount,
    edgeCount: params.edgeCount,
  };
}

export async function getAuditPackageReadiness(params: {
  organizationId: string;
  from: Date;
  to: Date;
}): Promise<AuditPackageReadiness> {
  const evidenceWhere = buildEvidenceWhere({
    organizationId: params.organizationId,
    collectedFrom: params.from,
    collectedTo: params.to,
  });

  const now = new Date();

  const [
    evidenceTotal,
    evidenceWithS3,
    approvedPolicies,
    approvedWithPdf,
    approvedRisk,
    baaRecords,
    trainingTotal,
    trainingOverdue,
    auditLogCount,
  ] = await Promise.all([
    prisma.evidence.count({ where: evidenceWhere }),
    prisma.evidence.count({
      where: { AND: [evidenceWhere, { s3Key: { not: null } }] },
    }),
    prisma.policy.count({
      where: {
        organizationId: params.organizationId,
        status: PolicyStatus.APPROVED,
      },
    }),
    prisma.policy.count({
      where: {
        organizationId: params.organizationId,
        status: PolicyStatus.APPROVED,
        sourceS3Key: { not: null },
      },
    }),
    prisma.riskAssessment.findFirst({
      where: {
        organizationId: params.organizationId,
        status: PolicyStatus.APPROVED,
      },
      select: { id: true, version: true },
    }),
    prisma.baaRecord.findMany({
      where: { organizationId: params.organizationId },
      select: { status: true },
    }),
    prisma.trainingRecord.count({
      where: { organizationId: params.organizationId },
    }),
    prisma.trainingRecord.count({
      where: {
        organizationId: params.organizationId,
        nextDueAt: { lt: now },
      },
    }),
    prisma.auditLog.count({
      where: {
        organizationId: params.organizationId,
        createdAt: { gte: params.from, lte: params.to },
      },
    }),
  ]);

  // Same tables as /hipaa/phi-map so checklist counts match the map UI.
  const [phiSystems, phiEdges] = await Promise.all([
    prisma.phiSystem.findMany({
      where: { organizationId: params.organizationId },
      select: { id: true },
    }),
    prisma.phiFlowEdge.findMany({
      where: { organizationId: params.organizationId },
      select: { id: true },
    }),
  ]);
  const phiSystemCount = phiSystems.length;
  const phiEdgeCount = phiEdges.length;

  const signed = baaRecords.filter((r) => r.status === BaaStatus.SIGNED).length;
  const expired = baaRecords.filter((r) => r.status === BaaStatus.EXPIRED).length;
  const pending = baaRecords.filter((r) => r.status === BaaStatus.PENDING).length;

  const byId: Record<AuditPackageSectionId, Scored> = {
    evidence: scoreEvidenceReadiness({
      total: evidenceTotal,
      withS3: evidenceWithS3,
    }),
    policies: scorePoliciesReadiness({
      approvedCount: approvedPolicies,
      approvedWithPdf,
    }),
    risk_assessment: scoreRiskReadiness({
      hasApproved: Boolean(approvedRisk),
      version: approvedRisk?.version,
    }),
    baa: scoreBaaReadiness({
      total: baaRecords.length,
      signed,
      expired,
      pending,
    }),
    training: scoreTrainingReadiness({
      total: trainingTotal,
      overdue: trainingOverdue,
    }),
    phi_map: scorePhiMapReadiness({
      systemCount: phiSystemCount,
      edgeCount: phiEdgeCount,
    }),
    audit_log: scoreAuditLogReadiness(auditLogCount),
    readme: {
      state: "ok",
      count: "Auto-generated",
      reason: "Generated automatically at export",
    },
  };

  const sections: ReadinessSection[] = AUDIT_PACKAGE_SECTION_IDS.map((id) => {
    const scored = byId[id];
    if (id === "phi_map") {
      return {
        id,
        label: AUDIT_PACKAGE_SECTION_LABELS[id],
        ...scored,
        // Guaranteed numeric fields for the checklist short count.
        systemCount: phiSystemCount,
        edgeCount: phiEdgeCount,
        count:
          scored.count?.trim() ||
          `${phiSystemCount} system${phiSystemCount === 1 ? "" : "s"}`,
      };
    }
    return {
      id,
      label: AUDIT_PACKAGE_SECTION_LABELS[id],
      ...scored,
    };
  });

  return {
    sections,
    percentReady: computePercentReady(sections),
  };
}
