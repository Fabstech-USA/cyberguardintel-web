import { ControlStatus } from "@/generated/prisma";

/** Client-safe control status constants (no server-only imports). */

export const CONTROL_STATUSES = [
  ControlStatus.NOT_STARTED,
  ControlStatus.IN_PROGRESS,
  ControlStatus.IMPLEMENTED,
  ControlStatus.NEEDS_REVIEW,
  ControlStatus.EXCEPTION,
] as const;

export const CONTROL_STATUS_LABELS: Record<ControlStatus, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  IMPLEMENTED: "Implemented",
  NEEDS_REVIEW: "Needs review",
  EXCEPTION: "Exception",
};

export function isControlStatus(value: string): value is ControlStatus {
  return (CONTROL_STATUSES as readonly string[]).includes(value);
}

/** Controls page deep-link for a single status filter. */
export function controlsHrefForStatus(status: ControlStatus): string {
  return `/hipaa/controls?status=${encodeURIComponent(status)}`;
}
