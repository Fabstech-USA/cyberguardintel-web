import { PolicyStatus } from "@/generated/prisma";

/** Allowed manual status changes (approve uses a dedicated endpoint). */
const TRANSITIONS: Record<PolicyStatus, readonly PolicyStatus[]> = {
  [PolicyStatus.DRAFT]: [PolicyStatus.UNDER_REVIEW, PolicyStatus.ARCHIVED],
  [PolicyStatus.UNDER_REVIEW]: [
    PolicyStatus.DRAFT,
    PolicyStatus.ARCHIVED,
  ],
  [PolicyStatus.APPROVED]: [PolicyStatus.UNDER_REVIEW, PolicyStatus.ARCHIVED],
  [PolicyStatus.ARCHIVED]: [PolicyStatus.DRAFT],
};

export const POLICY_STATUS_LABELS: Record<PolicyStatus, string> = {
  [PolicyStatus.DRAFT]: "Draft",
  [PolicyStatus.UNDER_REVIEW]: "Under review",
  [PolicyStatus.APPROVED]: "Approved",
  [PolicyStatus.ARCHIVED]: "Archived",
};

export function getAllowedPolicyTransitions(
  current: PolicyStatus
): PolicyStatus[] {
  return [...TRANSITIONS[current]];
}

export function canTransitionPolicyStatus(
  from: PolicyStatus,
  to: PolicyStatus
): boolean {
  if (from === to) return true;
  return TRANSITIONS[from].includes(to);
}

/** Statuses from which POST .../approve is valid. */
export const POLICY_APPROVABLE_STATUSES: readonly PolicyStatus[] = [
  PolicyStatus.DRAFT,
  PolicyStatus.UNDER_REVIEW,
];

export function canApprovePolicyStatus(status: PolicyStatus): boolean {
  return POLICY_APPROVABLE_STATUSES.includes(status);
}
