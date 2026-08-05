import { describe, expect, it } from "vitest";
import { ControlStatus } from "@/generated/prisma";
import {
  buildControlStatusRollup,
  controlStatusRollupSegments,
} from "@/lib/dashboard-control-status";

describe("buildControlStatusRollup", () => {
  it("counts each status bucket", () => {
    const rollup = buildControlStatusRollup([
      ControlStatus.NOT_STARTED,
      ControlStatus.NOT_STARTED,
      ControlStatus.IN_PROGRESS,
      ControlStatus.IMPLEMENTED,
      ControlStatus.IMPLEMENTED,
      ControlStatus.NEEDS_REVIEW,
      ControlStatus.EXCEPTION,
    ]);
    expect(rollup).toEqual({
      total: 7,
      notStarted: 2,
      inProgress: 1,
      implemented: 2,
      needsReview: 1,
      exception: 1,
    });
  });

  it("exposes segments for the overview UI", () => {
    const segments = controlStatusRollupSegments(
      buildControlStatusRollup([ControlStatus.IMPLEMENTED])
    );
    expect(segments.find((s) => s.key === "implemented")?.count).toBe(1);
    expect(segments.find((s) => s.key === "notStarted")?.count).toBe(0);
    expect(segments.find((s) => s.key === "implemented")?.href).toBe(
      "/hipaa/controls?status=IMPLEMENTED"
    );
    expect(segments.find((s) => s.key === "notStarted")?.href).toBe(
      "/hipaa/controls?status=NOT_STARTED"
    );
  });
});
