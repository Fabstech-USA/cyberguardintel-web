import { describe, expect, it } from "vitest";
import { PolicyStatus } from "@/generated/prisma";
import {
  canApprovePolicyStatus,
  canTransitionPolicyStatus,
  getAllowedPolicyTransitions,
} from "@/lib/hipaa-policy-status";

describe("hipaa-policy-status", () => {
  it("allows draft to under review and archived", () => {
    expect(
      canTransitionPolicyStatus(
        PolicyStatus.DRAFT,
        PolicyStatus.UNDER_REVIEW
      )
    ).toBe(true);
    expect(
      canTransitionPolicyStatus(PolicyStatus.DRAFT, PolicyStatus.ARCHIVED)
    ).toBe(true);
    expect(
      canTransitionPolicyStatus(PolicyStatus.DRAFT, PolicyStatus.APPROVED)
    ).toBe(false);
  });

  it("allows approve only from draft or under review", () => {
    expect(canApprovePolicyStatus(PolicyStatus.DRAFT)).toBe(true);
    expect(canApprovePolicyStatus(PolicyStatus.UNDER_REVIEW)).toBe(true);
    expect(canApprovePolicyStatus(PolicyStatus.APPROVED)).toBe(false);
  });

  it("returns transitions for approved", () => {
    const t = getAllowedPolicyTransitions(PolicyStatus.APPROVED);
    expect(t).toContain(PolicyStatus.UNDER_REVIEW);
    expect(t).toContain(PolicyStatus.ARCHIVED);
  });
});
