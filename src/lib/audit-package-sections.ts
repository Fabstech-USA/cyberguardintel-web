export const AUDIT_PACKAGE_SECTION_IDS = [
  "evidence",
  "policies",
  "risk_assessment",
  "baa",
  "training",
  "phi_map",
  "audit_log",
  "readme",
] as const;

export type AuditPackageSectionId = (typeof AUDIT_PACKAGE_SECTION_IDS)[number];

export const AUDIT_PACKAGE_SECTION_LABELS: Record<AuditPackageSectionId, string> = {
  evidence: "Evidence items",
  policies: "Approved policies",
  risk_assessment: "Risk assessment",
  baa: "BAA inventory",
  training: "Training records",
  phi_map: "PHI flow map",
  audit_log: "Audit log export",
  readme: "Cover README",
};

export function isAuditPackageSectionId(value: string): value is AuditPackageSectionId {
  return (AUDIT_PACKAGE_SECTION_IDS as readonly string[]).includes(value);
}

export function normalizeAuditPackageSections(
  sections?: string[] | null
): AuditPackageSectionId[] {
  if (!sections || sections.length === 0) {
    return [...AUDIT_PACKAGE_SECTION_IDS];
  }
  const selected = sections.filter(isAuditPackageSectionId);
  if (!selected.includes("readme")) {
    selected.push("readme");
  }
  return AUDIT_PACKAGE_SECTION_IDS.filter((id) => selected.includes(id));
}

export type ProgressStepStatus = "pending" | "running" | "done" | "error";

export type AuditProgressStep = {
  id: string;
  label: string;
  status: ProgressStepStatus;
};

export function initialProgressSteps(
  sections: AuditPackageSectionId[]
): AuditProgressStep[] {
  const steps: AuditProgressStep[] = [
    { id: "load", label: "Load organization data", status: "pending" },
  ];

  if (sections.includes("evidence")) {
    steps.push({ id: "evidence", label: "Fetch evidence files", status: "pending" });
  }
  if (sections.includes("policies")) {
    steps.push({ id: "policies", label: "Fetch approved policies", status: "pending" });
  }
  if (sections.includes("risk_assessment")) {
    steps.push({
      id: "risk_assessment",
      label: "Render risk assessment PDF",
      status: "pending",
    });
  }
  if (
    sections.includes("baa") ||
    sections.includes("training") ||
    sections.includes("phi_map") ||
    sections.includes("audit_log")
  ) {
    steps.push({ id: "csvs", label: "Build inventory CSVs", status: "pending" });
  }
  if (sections.includes("readme")) {
    steps.push({ id: "readme", label: "Write cover README", status: "pending" });
  }
  steps.push({ id: "upload", label: "Upload ZIP to S3", status: "pending" });
  return steps;
}
