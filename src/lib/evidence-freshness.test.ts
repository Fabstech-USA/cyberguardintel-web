import { describe, expect, it } from "vitest";

import {
  getFreshnessTier,
  resolveEffectiveExpiresAt,
} from "@/lib/evidence-freshness";

describe("evidence-freshness", () => {
  const now = new Date("2026-06-18T12:00:00.000Z");

  it("resolveEffectiveExpiresAt prefers expiresAt column", () => {
    const expiresAt = new Date("2026-12-01T00:00:00.000Z");
    expect(
      resolveEffectiveExpiresAt({
        expiresAt,
        collectedAt: now,
        metadata: { evidenceType: "log" },
      })
    ).toEqual(expiresAt);
  });

  it("getFreshnessTier returns stale when expired", () => {
    expect(
      getFreshnessTier(
        {
          expiresAt: new Date("2026-06-01T00:00:00.000Z"),
          collectedAt: now,
          metadata: null,
        },
        now
      )
    ).toBe("stale");
  });

  it("getFreshnessTier returns expiring within 14 days", () => {
    expect(
      getFreshnessTier(
        {
          expiresAt: new Date("2026-06-25T00:00:00.000Z"),
          collectedAt: now,
          metadata: null,
        },
        now
      )
    ).toBe("expiring");
  });

  it("getFreshnessTier returns fresh when far from expiry", () => {
    expect(
      getFreshnessTier(
        {
          expiresAt: new Date("2026-12-01T00:00:00.000Z"),
          collectedAt: now,
          metadata: null,
        },
        now
      )
    ).toBe("fresh");
  });
});
