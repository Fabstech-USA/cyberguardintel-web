import { ControlStatus } from "@/generated/prisma";
import {
  CONTROL_STATUS_LABELS,
  controlsHrefForStatus,
} from "@/lib/hipaa-control-status-shared";

export type ControlStatusRollup = {
  total: number;
  notStarted: number;
  inProgress: number;
  implemented: number;
  needsReview: number;
  exception: number;
};

export type ControlStatusRollupSegment = {
  key: keyof Omit<ControlStatusRollup, "total">;
  status: ControlStatus;
  label: string;
  count: number;
  href: string;
};

export function buildControlStatusRollup(
  statuses: ReadonlyArray<ControlStatus | string>
): ControlStatusRollup {
  const rollup: ControlStatusRollup = {
    total: statuses.length,
    notStarted: 0,
    inProgress: 0,
    implemented: 0,
    needsReview: 0,
    exception: 0,
  };

  for (const status of statuses) {
    switch (status) {
      case ControlStatus.IN_PROGRESS:
      case "IN_PROGRESS":
        rollup.inProgress += 1;
        break;
      case ControlStatus.IMPLEMENTED:
      case "IMPLEMENTED":
        rollup.implemented += 1;
        break;
      case ControlStatus.NEEDS_REVIEW:
      case "NEEDS_REVIEW":
        rollup.needsReview += 1;
        break;
      case ControlStatus.EXCEPTION:
      case "EXCEPTION":
        rollup.exception += 1;
        break;
      default:
        rollup.notStarted += 1;
        break;
    }
  }

  return rollup;
}

export function controlStatusRollupSegments(
  rollup: ControlStatusRollup
): ControlStatusRollupSegment[] {
  return [
    {
      key: "implemented",
      status: ControlStatus.IMPLEMENTED,
      label: CONTROL_STATUS_LABELS.IMPLEMENTED,
      count: rollup.implemented,
      href: controlsHrefForStatus(ControlStatus.IMPLEMENTED),
    },
    {
      key: "inProgress",
      status: ControlStatus.IN_PROGRESS,
      label: CONTROL_STATUS_LABELS.IN_PROGRESS,
      count: rollup.inProgress,
      href: controlsHrefForStatus(ControlStatus.IN_PROGRESS),
    },
    {
      key: "needsReview",
      status: ControlStatus.NEEDS_REVIEW,
      label: CONTROL_STATUS_LABELS.NEEDS_REVIEW,
      count: rollup.needsReview,
      href: controlsHrefForStatus(ControlStatus.NEEDS_REVIEW),
    },
    {
      key: "exception",
      status: ControlStatus.EXCEPTION,
      label: CONTROL_STATUS_LABELS.EXCEPTION,
      count: rollup.exception,
      href: controlsHrefForStatus(ControlStatus.EXCEPTION),
    },
    {
      key: "notStarted",
      status: ControlStatus.NOT_STARTED,
      label: CONTROL_STATUS_LABELS.NOT_STARTED,
      count: rollup.notStarted,
      href: controlsHrefForStatus(ControlStatus.NOT_STARTED),
    },
  ];
}
