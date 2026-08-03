/**
 * Dashboard "Next up" queue ordered by estimated readiness score impact.
 * Point values come from the same formula as `recalculateHipaaScore`.
 * Status actions claim 0 points (status does not feed readiness today).
 */

import { ControlStatus } from "@/generated/prisma";
import { BAA_EVIDENCE_CONTROL_REF } from "@/lib/baa-control-ref";
import { HIPAA_POLICY_TARGET } from "@/lib/hipaa-policy-catalog";
import {
  estimateEvidenceCoverageScoreGain,
  estimateOwnerAssignmentScoreGain,
  estimatePolicyApprovalScoreGain,
  type ControlScoreSnapshot,
} from "@/lib/hipaa-scoring-core";

export type DashboardNextStep = {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  href: string;
  ctaLabel: string;
  /** Estimated readiness points (0 to 100 scale). 0 = no score claim. */
  estimatedPoints: number;
};

export type DashboardNextStepsInput = {
  controls: ReadonlyArray<ControlScoreSnapshot>;
  approvedPolicyCount: number;
  /** Policies that exist but are not yet APPROVED (draft / under review). */
  unapprovedPolicyCount: number;
  hasConnectedIntegration: boolean;
  hasSignedBaa: boolean;
  hasRiskAssessment: boolean;
  now?: Date;
};

/**
 * Control refs commonly populated by a first identity/cloud integration sync
 * (AWS, Google Workspace, Okta, M365, and demo stubs).
 */
export const TYPICAL_FIRST_INTEGRATION_CONTROL_REFS = [
  "164.312(a)(1)",
  "164.312(b)",
  "164.312(d)",
  "164.312(c)(1)",
  "164.312(e)(1)",
  "164.308(a)(3)",
  "164.308(a)(4)",
  "164.308(a)(5)",
] as const;

function formatPoints(points: number): string {
  if (Number.isInteger(points)) return `+${points}`;
  return `+${points.toFixed(1)}`;
}

function formatSubtitle(points: number, timeLabel: string): string {
  if (points <= 0) return timeLabel;
  return `${formatPoints(points)} readiness · ${timeLabel}`;
}

type Candidate = Omit<DashboardNextStep, "order">;

/**
 * Build incomplete next steps sorted by estimated readiness impact (desc).
 * Only claims points for actions that actually move `OrgFramework.score`.
 */
export function buildDashboardNextSteps(
  input: DashboardNextStepsInput
): DashboardNextStep[] {
  const now = input.now ?? new Date();
  const candidates: Candidate[] = [];

  const missingApprovals = Math.max(
    0,
    HIPAA_POLICY_TARGET - input.approvedPolicyCount
  );
  // Prefer counting policies they can approve now; otherwise remaining toward target.
  const approvalsTowardTarget =
    input.unapprovedPolicyCount > 0
      ? Math.min(missingApprovals, input.unapprovedPolicyCount)
      : missingApprovals;

  if (approvalsTowardTarget > 0) {
    const points = estimatePolicyApprovalScoreGain(
      input.controls,
      input.approvedPolicyCount,
      approvalsTowardTarget,
      now
    );
    if (points > 0) {
      const hasDrafts = input.unapprovedPolicyCount > 0;
      candidates.push({
        id: "policies",
        title: hasDrafts
          ? "Approve draft policies"
          : "Generate and approve policies",
        subtitle: formatSubtitle(
          points,
          hasDrafts
            ? `after approving ${approvalsTowardTarget} draft${approvalsTowardTarget === 1 ? "" : "s"} · about 10 to 20 min`
            : `after approving new drafts · about 15 to 25 min`
        ),
        href: "/hipaa/policies",
        ctaLabel: hasDrafts ? "Review" : "Generate",
        estimatedPoints: points,
      });
    }
  }

  if (!input.hasConnectedIntegration) {
    const points = estimateEvidenceCoverageScoreGain(
      input.controls,
      input.approvedPolicyCount,
      TYPICAL_FIRST_INTEGRATION_CONTROL_REFS,
      now
    );
    if (points > 0) {
      candidates.push({
        id: "integrations",
        title: "Connect your first integration",
        subtitle: formatSubtitle(
          points,
          "after first evidence sync · about 5 to 10 min"
        ),
        href: "/integrations",
        ctaLabel: "Connect",
        estimatedPoints: points,
      });
    }
  }

  const uncoveredRefs = input.controls
    .filter((c) => c.evidence.length === 0)
    .map((c) => c.controlRef);
  // When an integration is already connected, still nudge remaining evidence gaps.
  if (uncoveredRefs.length > 0 && input.hasConnectedIntegration) {
    const sampleRefs = uncoveredRefs.slice(0, 12);
    const points = estimateEvidenceCoverageScoreGain(
      input.controls,
      input.approvedPolicyCount,
      sampleRefs,
      now
    );
    if (points > 0) {
      candidates.push({
        id: "evidence-gaps",
        title: "Cover controls that still need evidence",
        subtitle: formatSubtitle(
          points,
          `${uncoveredRefs.length} control${uncoveredRefs.length === 1 ? "" : "s"} without evidence · about 10 to 20 min`
        ),
        href: "/hipaa/controls",
        ctaLabel: "Review",
        estimatedPoints: points,
      });
    }
  }

  if (!input.hasSignedBaa) {
    const points = estimateEvidenceCoverageScoreGain(
      input.controls,
      input.approvedPolicyCount,
      [BAA_EVIDENCE_CONTROL_REF],
      now
    );
    if (points > 0) {
      candidates.push({
        id: "baa",
        title: "Add a signed vendor BAA",
        subtitle: formatSubtitle(
          points,
          "when the BAA is signed and synced · about 5 min"
        ),
        href: "/hipaa/baa-tracker",
        ctaLabel: "Add",
        estimatedPoints: points,
      });
    }
  }

  const unownedCount = input.controls.filter((c) => !c.ownerId).length;
  if (unownedCount > 0) {
    const points = estimateOwnerAssignmentScoreGain(
      input.controls,
      input.approvedPolicyCount,
      now
    );
    if (points > 0) {
      candidates.push({
        id: "control-owners",
        title: "Assign control owners",
        subtitle: formatSubtitle(
          points,
          `after assigning ${unownedCount} control${unownedCount === 1 ? "" : "s"} · about 5 to 10 min`
        ),
        href: "/hipaa/controls",
        ctaLabel: "Assign",
        estimatedPoints: points,
      });
    }
  }

  const readyToConfirm = input.controls.filter((c) => {
    const status = c.status ?? ControlStatus.NOT_STARTED;
    const unfinished =
      status === ControlStatus.NOT_STARTED ||
      status === ControlStatus.IN_PROGRESS ||
      status === "NOT_STARTED" ||
      status === "IN_PROGRESS";
    return unfinished && c.evidence.length > 0 && Boolean(c.ownerId);
  }).length;

  if (readyToConfirm > 0) {
    candidates.push({
      id: "mark-implemented",
      title: "Confirm implemented controls",
      subtitle: `${readyToConfirm} control${readyToConfirm === 1 ? "" : "s"} have evidence and an owner but are not marked Implemented · about 5 min`,
      href: "/hipaa/controls",
      ctaLabel: "Update status",
      estimatedPoints: 0,
    });
  }

  const notStartedCount = input.controls.filter((c) => {
    const status = c.status ?? ControlStatus.NOT_STARTED;
    return (
      status === ControlStatus.NOT_STARTED || status === "NOT_STARTED"
    );
  }).length;

  // Risk assessment does not feed the readiness formula today. Keep it as an
  // audit-prep nudge that also upgrades confirmed controls to Implemented.
  if (!input.hasRiskAssessment) {
    candidates.push({
      id: "risk-assessment",
      title: "Run your HIPAA risk assessment",
      subtitle:
        notStartedCount > 0
          ? `Marks confirmed controls Implemented and builds your audit risk analysis · ${notStartedCount} still not started · about 10 to 15 min`
          : "Marks confirmed controls Implemented and builds your audit risk analysis · about 10 to 15 min",
      href: "/hipaa/risk-assessment",
      ctaLabel: "Start",
      estimatedPoints: 0,
    });
  } else if (notStartedCount > 0) {
    candidates.push({
      id: "risk-assessment-update",
      title: "Update risk assessment control checks",
      subtitle: `${notStartedCount} control${notStartedCount === 1 ? "" : "s"} still Not started. Re-run the wizard to mark what you have in place · about 10 min`,
      href: "/hipaa/risk-assessment",
      ctaLabel: "Update",
      estimatedPoints: 0,
    });
  }

  candidates.sort((a, b) => {
    if (b.estimatedPoints !== a.estimatedPoints) {
      return b.estimatedPoints - a.estimatedPoints;
    }
    return a.title.localeCompare(b.title);
  });

  return candidates.map((step, index) => ({
    ...step,
    order: index + 1,
  }));
}
