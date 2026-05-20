import { PolicyStatus, PolicyType, type Policy } from "@/generated/prisma";
import {
  type SafeguardBucket,
} from "@/lib/dashboard-safeguards";

export const HIPAA_POLICY_TARGET = 12;

/** Display order aligned with product mock (table rows). */
export const HIPAA_POLICY_TYPE_ORDER: readonly PolicyType[] = [
  PolicyType.ACCESS_CONTROL,
  PolicyType.AUDIT_CONTROLS,
  PolicyType.DATA_CLASSIFICATION,
  PolicyType.TRANSMISSION_SECURITY,
  PolicyType.WORKFORCE_TRAINING,
  PolicyType.INCIDENT_RESPONSE,
  PolicyType.CONTINGENCY_PLAN,
  PolicyType.DEVICE_MEDIA,
  PolicyType.FACILITY_ACCESS,
  PolicyType.WORKSTATION_USE,
  PolicyType.INFORMATION_ACCESS,
  PolicyType.VENDOR_MANAGEMENT,
] as const;

export type PolicyUiStatus = PolicyStatus | "NOT_STARTED";

export type HipaaPolicyCatalogEntry = {
  type: PolicyType;
  displayTitle: string;
  cfr: string;
  safeguard: SafeguardBucket;
};

const CFR_BY_TYPE: Record<PolicyType, string> = {
  [PolicyType.ACCESS_CONTROL]: "45 CFR 164.312(a)(1)",
  [PolicyType.AUDIT_CONTROLS]: "45 CFR 164.312(b)",
  [PolicyType.INCIDENT_RESPONSE]: "45 CFR 164.308(a)(6)",
  [PolicyType.WORKFORCE_TRAINING]: "45 CFR 164.308(a)(5)",
  [PolicyType.DEVICE_MEDIA]: "45 CFR 164.310(d)(1)",
  [PolicyType.CONTINGENCY_PLAN]: "45 CFR 164.308(a)(7)",
  [PolicyType.TRANSMISSION_SECURITY]: "45 CFR 164.312(e)(1)",
  [PolicyType.FACILITY_ACCESS]: "45 CFR 164.310(a)(1)",
  [PolicyType.WORKSTATION_USE]: "45 CFR 164.310(b)",
  [PolicyType.INFORMATION_ACCESS]: "45 CFR 164.308(a)(4)",
  [PolicyType.DATA_CLASSIFICATION]: "45 CFR 164.312(c)(1)",
  [PolicyType.VENDOR_MANAGEMENT]: "45 CFR 164.308(b)(1)",
};

const TITLE_BY_TYPE: Record<PolicyType, string> = {
  [PolicyType.ACCESS_CONTROL]: "Access control",
  [PolicyType.AUDIT_CONTROLS]: "Audit controls",
  [PolicyType.DATA_CLASSIFICATION]: "Integrity & data classification",
  [PolicyType.TRANSMISSION_SECURITY]: "Transmission security",
  [PolicyType.WORKFORCE_TRAINING]: "Workforce training",
  [PolicyType.INCIDENT_RESPONSE]: "Incident response",
  [PolicyType.CONTINGENCY_PLAN]: "Contingency plan",
  [PolicyType.DEVICE_MEDIA]: "Device & media controls",
  [PolicyType.FACILITY_ACCESS]: "Facility access",
  [PolicyType.WORKSTATION_USE]: "Workstation use",
  [PolicyType.INFORMATION_ACCESS]: "Information access management",
  [PolicyType.VENDOR_MANAGEMENT]: "Vendor management",
};

/** Fixed safeguard bucket per policy type (for filtering). */
const SAFEGUARD_BY_TYPE: Record<PolicyType, SafeguardBucket> = {
  [PolicyType.ACCESS_CONTROL]: "Technical",
  [PolicyType.AUDIT_CONTROLS]: "Technical",
  [PolicyType.INCIDENT_RESPONSE]: "Administrative",
  [PolicyType.WORKFORCE_TRAINING]: "Administrative",
  [PolicyType.DEVICE_MEDIA]: "Physical",
  [PolicyType.CONTINGENCY_PLAN]: "Administrative",
  [PolicyType.TRANSMISSION_SECURITY]: "Technical",
  [PolicyType.FACILITY_ACCESS]: "Physical",
  [PolicyType.WORKSTATION_USE]: "Physical",
  [PolicyType.INFORMATION_ACCESS]: "Administrative",
  [PolicyType.DATA_CLASSIFICATION]: "Technical",
  [PolicyType.VENDOR_MANAGEMENT]: "Administrative",
};

export function getHipaaPolicyCatalog(): HipaaPolicyCatalogEntry[] {
  return HIPAA_POLICY_TYPE_ORDER.map((type) => ({
    type,
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
