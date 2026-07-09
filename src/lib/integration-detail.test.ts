import { describe, expect, it } from "vitest";

import {
  buildSyncActivityBars,
  canConfirmDisconnect,
  computeSuccessRate,
  extractSafeConfig,
  formatTimeUntil,
  getNextScheduledSyncAt,
  jobDurationMs,
} from "@/lib/integration-detail";
import { EvidenceSource } from "@/generated/prisma";
import { buildEvidenceWhere } from "@/lib/evidence-list-filters";

describe("integration-detail helpers", () => {
  it("computes success rate from finished jobs only", () => {
    expect(
      computeSuccessRate([
        { status: "COMPLETED" },
        { status: "COMPLETED" },
        { status: "FAILED" },
        { status: "RUNNING" },
      ])
    ).toBe(67);
    expect(computeSuccessRate([{ status: "QUEUED" }])).toBeNull();
  });

  it("builds 14-day activity bars with failed days marked", () => {
    const now = new Date("2026-07-09T15:00:00.000Z");
    const bars = buildSyncActivityBars(
      [
        {
          status: "COMPLETED",
          evidenceAdded: 5,
          startedAt: new Date("2026-07-09T02:00:00.000Z"),
          completedAt: new Date("2026-07-09T02:01:00.000Z"),
          createdAt: new Date("2026-07-09T02:00:00.000Z"),
        },
        {
          status: "FAILED",
          evidenceAdded: 0,
          startedAt: new Date("2026-07-08T02:00:00.000Z"),
          completedAt: new Date("2026-07-08T02:00:08.000Z"),
          createdAt: new Date("2026-07-08T02:00:00.000Z"),
        },
      ],
      now,
      14
    );

    expect(bars).toHaveLength(14);
    expect(bars.at(-1)).toMatchObject({
      date: "2026-07-09",
      evidenceAdded: 5,
      failed: false,
    });
    expect(bars.at(-2)).toMatchObject({
      date: "2026-07-08",
      evidenceAdded: 0,
      failed: true,
    });
  });

  it("schedules next sync at 02:00 UTC", () => {
    const before = getNextScheduledSyncAt(new Date("2026-07-09T01:00:00.000Z"));
    expect(before.toISOString()).toBe("2026-07-09T02:00:00.000Z");
    const after = getNextScheduledSyncAt(new Date("2026-07-09T03:00:00.000Z"));
    expect(after.toISOString()).toBe("2026-07-10T02:00:00.000Z");
  });

  it("formats time until next sync", () => {
    expect(
      formatTimeUntil(
        "2026-07-09T05:30:00.000Z",
        new Date("2026-07-09T03:00:00.000Z")
      )
    ).toBe("2h 30m");
    expect(
      formatTimeUntil(
        "2026-07-09T01:00:00.000Z",
        new Date("2026-07-09T03:00:00.000Z")
      )
    ).toBe("soon");
  });

  it("computes job duration", () => {
    expect(
      jobDurationMs(
        new Date("2026-07-09T02:00:00.000Z"),
        new Date("2026-07-09T02:00:42.000Z")
      )
    ).toBe(42_000);
    expect(jobDurationMs(null, new Date())).toBeNull();
  });

  it("extracts only non-sensitive config fields", () => {
    expect(
      extractSafeConfig(
        { fixture: true, profile: "aws", region: "us-east-1" },
        {
          access_key_id: "AKIA",
          secret_access_key: "secret",
          region: "us-west-2",
        }
      )
    ).toEqual([{ key: "region", label: "Region", value: "us-east-1" }]);
  });
});

describe("disconnect confirm gating", () => {
  it("requires exact DISCONNECT text", () => {
    expect(canConfirmDisconnect("")).toBe(false);
    expect(canConfirmDisconnect("disconnect")).toBe(false);
    expect(canConfirmDisconnect("DISCONNECT")).toBe(true);
  });
});

describe("evidence filter integrationId", () => {
  it("filters by integrationId when provided", () => {
    expect(
      buildEvidenceWhere({
        organizationId: "org_1",
        integrationId: "int_1",
        source: "aws",
      })
    ).toEqual({
      AND: [
        { organizationId: "org_1", isValid: true },
        {
          sourceType: EvidenceSource.INTEGRATION,
          integrationId: "int_1",
        },
      ],
    });
  });
});
