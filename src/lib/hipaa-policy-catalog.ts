import { PolicyStatus, PolicyType, type Policy } from "@/generated/prisma";
import {
  type SafeguardBucket,
} from "@/lib/dashboard-safeguards";

export const HIPAA_POLICY_TARGET = 18;

/** Display order: POL-001 through POL-018 (CGI standard policy set). */
export const HIPAA_POLICY_TYPE_ORDER: readonly PolicyType[] = [
  PolicyType.SECURITY_MANAGEMENT_PROCESS,
  PolicyType.ASSIGNED_SECURITY_RESPONSIBILITY,
  PolicyType.WORKFORCE_SECURITY,
  PolicyType.INFORMATION_ACCESS,
  PolicyType.WORKFORCE_TRAINING,
  PolicyType.INCIDENT_RESPONSE,
  PolicyType.CONTINGENCY_PLAN,
  PolicyType.PERIODIC_EVALUATION,
  PolicyType.VENDOR_MANAGEMENT,
  PolicyType.FACILITY_ACCESS,
  PolicyType.WORKSTATION_USE,
  PolicyType.DEVICE_MEDIA,
  PolicyType.ACCESS_CONTROL,
  PolicyType.AUDIT_CONTROLS,
  PolicyType.DATA_CLASSIFICATION,
  PolicyType.PERSON_ENTITY_AUTHENTICATION,
  PolicyType.TRANSMISSION_SECURITY,
  PolicyType.POLICIES_PROCEDURES_DOCUMENTATION,
] as const;

export const POLICY_ID_BY_TYPE: Record<PolicyType, string> = {
  [PolicyType.SECURITY_MANAGEMENT_PROCESS]: "POL-001",
  [PolicyType.ASSIGNED_SECURITY_RESPONSIBILITY]: "POL-002",
  [PolicyType.WORKFORCE_SECURITY]: "POL-003",
  [PolicyType.INFORMATION_ACCESS]: "POL-004",
  [PolicyType.WORKFORCE_TRAINING]: "POL-005",
  [PolicyType.INCIDENT_RESPONSE]: "POL-006",
  [PolicyType.CONTINGENCY_PLAN]: "POL-007",
  [PolicyType.PERIODIC_EVALUATION]: "POL-008",
  [PolicyType.VENDOR_MANAGEMENT]: "POL-009",
  [PolicyType.FACILITY_ACCESS]: "POL-010",
  [PolicyType.WORKSTATION_USE]: "POL-011",
  [PolicyType.DEVICE_MEDIA]: "POL-012",
  [PolicyType.ACCESS_CONTROL]: "POL-013",
  [PolicyType.AUDIT_CONTROLS]: "POL-014",
  [PolicyType.DATA_CLASSIFICATION]: "POL-015",
  [PolicyType.PERSON_ENTITY_AUTHENTICATION]: "POL-016",
  [PolicyType.TRANSMISSION_SECURITY]: "POL-017",
  [PolicyType.POLICIES_PROCEDURES_DOCUMENTATION]: "POL-018",
};

export type PolicyUiStatus = PolicyStatus | "NOT_STARTED";

export type HipaaPolicyCatalogEntry = {
  type: PolicyType;
  policyId: string;
  displayTitle: string;
  cfr: string;
  safeguard: SafeguardBucket;
};

const CFR_BY_TYPE: Record<PolicyType, string> = {
  [PolicyType.SECURITY_MANAGEMENT_PROCESS]: "45 CFR 164.308(a)(1)",
  [PolicyType.ASSIGNED_SECURITY_RESPONSIBILITY]: "45 CFR 164.308(a)(2)",
  [PolicyType.WORKFORCE_SECURITY]: "45 CFR 164.308(a)(3)",
  [PolicyType.INFORMATION_ACCESS]: "45 CFR 164.308(a)(4)",
  [PolicyType.WORKFORCE_TRAINING]: "45 CFR 164.308(a)(5)",
  [PolicyType.INCIDENT_RESPONSE]: "45 CFR 164.308(a)(6)",
  [PolicyType.CONTINGENCY_PLAN]: "45 CFR 164.308(a)(7)",
  [PolicyType.PERIODIC_EVALUATION]: "45 CFR 164.308(a)(8)",
  [PolicyType.VENDOR_MANAGEMENT]: "45 CFR 164.308(b)(1)",
  [PolicyType.FACILITY_ACCESS]: "45 CFR 164.310(a)(1)",
  [PolicyType.WORKSTATION_USE]: "45 CFR 164.310(b), 164.310(c)",
  [PolicyType.DEVICE_MEDIA]: "45 CFR 164.310(d)(1)",
  [PolicyType.ACCESS_CONTROL]: "45 CFR 164.312(a)(1)",
  [PolicyType.AUDIT_CONTROLS]: "45 CFR 164.312(b)",
  [PolicyType.DATA_CLASSIFICATION]: "45 CFR 164.312(c)(1)",
  [PolicyType.PERSON_ENTITY_AUTHENTICATION]: "45 CFR 164.312(d)",
  [PolicyType.TRANSMISSION_SECURITY]: "45 CFR 164.312(e)(1)",
  [PolicyType.POLICIES_PROCEDURES_DOCUMENTATION]: "45 CFR 164.316",
};

const TITLE_BY_TYPE: Record<PolicyType, string> = {
  [PolicyType.SECURITY_MANAGEMENT_PROCESS]: "Security management process",
  [PolicyType.ASSIGNED_SECURITY_RESPONSIBILITY]:
    "Assigned security responsibility",
  [PolicyType.WORKFORCE_SECURITY]: "Workforce security",
  [PolicyType.INFORMATION_ACCESS]: "Information access management",
  [PolicyType.WORKFORCE_TRAINING]: "Security awareness and training",
  [PolicyType.INCIDENT_RESPONSE]: "Security incident response",
  [PolicyType.CONTINGENCY_PLAN]: "Contingency planning",
  [PolicyType.PERIODIC_EVALUATION]: "Periodic evaluation",
  [PolicyType.VENDOR_MANAGEMENT]: "Business associate agreement",
  [PolicyType.FACILITY_ACCESS]: "Facility access controls",
  [PolicyType.WORKSTATION_USE]: "Workstation use and security",
  [PolicyType.DEVICE_MEDIA]: "Device and media controls",
  [PolicyType.ACCESS_CONTROL]: "Technical access control",
  [PolicyType.AUDIT_CONTROLS]: "Audit controls",
  [PolicyType.DATA_CLASSIFICATION]: "Data integrity",
  [PolicyType.PERSON_ENTITY_AUTHENTICATION]: "Person and entity authentication",
  [PolicyType.TRANSMISSION_SECURITY]: "Transmission security",
  [PolicyType.POLICIES_PROCEDURES_DOCUMENTATION]:
    "Policies, procedures and documentation",
};

const SAFEGUARD_BY_TYPE: Record<PolicyType, SafeguardBucket> = {
  [PolicyType.SECURITY_MANAGEMENT_PROCESS]: "Administrative",
  [PolicyType.ASSIGNED_SECURITY_RESPONSIBILITY]: "Administrative",
  [PolicyType.WORKFORCE_SECURITY]: "Administrative",
  [PolicyType.INFORMATION_ACCESS]: "Administrative",
  [PolicyType.WORKFORCE_TRAINING]: "Administrative",
  [PolicyType.INCIDENT_RESPONSE]: "Administrative",
  [PolicyType.CONTINGENCY_PLAN]: "Administrative",
  [PolicyType.PERIODIC_EVALUATION]: "Administrative",
  [PolicyType.VENDOR_MANAGEMENT]: "Administrative",
  [PolicyType.FACILITY_ACCESS]: "Physical",
  [PolicyType.WORKSTATION_USE]: "Physical",
  [PolicyType.DEVICE_MEDIA]: "Physical",
  [PolicyType.ACCESS_CONTROL]: "Technical",
  [PolicyType.AUDIT_CONTROLS]: "Technical",
  [PolicyType.DATA_CLASSIFICATION]: "Technical",
  [PolicyType.PERSON_ENTITY_AUTHENTICATION]: "Technical",
  [PolicyType.TRANSMISSION_SECURITY]: "Technical",
  [PolicyType.POLICIES_PROCEDURES_DOCUMENTATION]: "Organizational",
};

export function getHipaaPolicyCatalog(): HipaaPolicyCatalogEntry[] {
  return HIPAA_POLICY_TYPE_ORDER.map((type) => ({
    type,
    policyId: POLICY_ID_BY_TYPE[type],
    displayTitle: TITLE_BY_TYPE[type],
    cfr: CFR_BY_TYPE[type],
    safeguard: SAFEGUARD_BY_TYPE[type],
  }));
}

export function getPolicyDisplayTitle(type: PolicyType): string {
  return TITLE_BY_TYPE[type];
}

export type MergedPolicyRow = {
  type: PolicyType;
  policyId: string;
  displayTitle: string;
  cfr: string;
  safeguard: SafeguardBucket;
  status: PolicyUiStatus;
  dbStatus: PolicyStatus | null;
  id: string | null;
  storedTitle: string | null;
  updatedAt: string | null;
  version: number | null;
  versionLabel: string | null;
  reviewDate: string | null;
  renewalDue: boolean;
  aiGenerated: boolean | null;
};

export function mergePoliciesWithCatalog(
  policies: Pick<
    Policy,
    | "id"
    | "type"
    | "title"
    | "status"
    | "version"
    | "updatedAt"
    | "reviewDate"
    | "aiGenerated"
  >[]
): MergedPolicyRow[] {
  const byType = new Map(policies.map((p) => [p.type, p]));
  const now = Date.now();

  return getHipaaPolicyCatalog().map((entry) => {
    const row = byType.get(entry.type);
    if (!row) {
      return {
        type: entry.type,
        policyId: entry.policyId,
        displayTitle: entry.displayTitle,
        cfr: entry.cfr,
        safeguard: entry.safeguard,
        status: "NOT_STARTED",
        dbStatus: null,
        id: null,
        storedTitle: null,
        updatedAt: null,
        version: null,
        versionLabel: null,
        reviewDate: null,
        renewalDue: false,
        aiGenerated: null,
      };
    }

    const reviewMs = row.reviewDate ? row.reviewDate.getTime() : null;
    const renewalDue =
      row.status === PolicyStatus.APPROVED &&
      reviewMs !== null &&
      reviewMs < now;

    return {
      type: entry.type,
      policyId: entry.policyId,
      displayTitle: entry.displayTitle,
      cfr: entry.cfr,
      safeguard: entry.safeguard,
      status: row.status,
      dbStatus: row.status,
      id: row.id,
      storedTitle: row.title,
      updatedAt: row.updatedAt.toISOString(),
      version: row.version,
      versionLabel: `v${row.version}`,
      reviewDate: row.reviewDate ? row.reviewDate.toISOString() : null,
      renewalDue,
      aiGenerated: row.aiGenerated,
    };
  });
}

export type PolicyStatusSummary = {
  approved: number;
  underReview: number;
  draft: number;
  notStarted: number;
  renewalDue: number;
};

export function summarizePolicyRows(rows: MergedPolicyRow[]): PolicyStatusSummary {
  let approved = 0;
  let underReview = 0;
  let draft = 0;
  let notStarted = 0;
  let renewalDue = 0;

  for (const r of rows) {
    if (r.renewalDue) renewalDue += 1;
    switch (r.status) {
      case PolicyStatus.APPROVED:
        approved += 1;
        break;
      case PolicyStatus.UNDER_REVIEW:
        underReview += 1;
        break;
      case PolicyStatus.DRAFT:
        draft += 1;
        break;
      case PolicyStatus.ARCHIVED:
        draft += 1;
        break;
      case "NOT_STARTED":
        notStarted += 1;
        break;
      default:
        break;
    }
  }

  return { approved, underReview, draft, notStarted, renewalDue };
}

export function filterMergedRows(
  rows: MergedPolicyRow[],
  filters: { status?: PolicyUiStatus | ""; safeguard?: SafeguardBucket | "" }
): MergedPolicyRow[] {
  return rows.filter((r) => {
    if (filters.status && r.status !== filters.status) return false;
    if (filters.safeguard && r.safeguard !== filters.safeguard) return false;
    return true;
  });
}

export function countMissingPolicies(rows: MergedPolicyRow[]): number {
  return rows.filter((r) => r.status === "NOT_STARTED").length;
}
