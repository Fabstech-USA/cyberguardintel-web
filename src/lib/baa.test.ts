import { describe, expect, it } from "vitest";

import { BaaStatus } from "@/generated/prisma";
import {
  BAA_REMINDER_DAYS,
  BaaCreateSchema,
  BaaUpdateSchema,
  baaSortCompare,
  getBaaComputedStatus,
  getBaaExpiryState,
  getBaaReminderDay,
  sortBaaRecords,
} from "@/lib/baa";

describe("BaaCreateSchema", () => {
  it("accepts a minimal pending payload", () => {
    const result = BaaCreateSchema.safeParse({
      vendorName: "Twilio",
      services: "SMS appointment reminders",
    });
    expect(result.success).toBe(true);
  });

  it("accepts explicit not-required state", () => {
    const result = BaaCreateSchema.safeParse({
      vendorName: "Stripe",
      services: "Patient payments",
      status: BaaStatus.NOT_REQUIRED,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email addresses", () => {
    const result = BaaCreateSchema.safeParse({
      vendorName: "Vendor",
      vendorEmail: "bad-email",
      services: "Services",
    });
    expect(result.success).toBe(false);
  });
});

describe("BaaUpdateSchema", () => {
  it("rejects an empty patch body", () => {
    const result = BaaUpdateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts a single field patch", () => {
    const result = BaaUpdateSchema.safeParse({
      status: BaaStatus.SIGNED,
    });
    expect(result.success).toBe(true);
  });
});

describe("getBaaComputedStatus", () => {
  const now = new Date("2026-05-12T12:00:00Z");

  it("derives expired from signed rows whose expiry has passed", () => {
    expect(
      getBaaComputedStatus(
        { status: BaaStatus.SIGNED, expiresAt: new Date("2026-05-01T00:00:00Z") },
        now
      )
    ).toBe(BaaStatus.EXPIRED);
  });

  it("preserves not-required rows", () => {
    expect(
      getBaaComputedStatus(
        { status: BaaStatus.NOT_REQUIRED, expiresAt: null },
        now
      )
    ).toBe(BaaStatus.NOT_REQUIRED);
  });
});

describe("getBaaExpiryState", () => {
  const now = new Date("2026-05-12T12:00:00Z");

  it("flags upcoming expiries within 30 days as warning", () => {
    expect(
      getBaaExpiryState(
        { status: BaaStatus.SIGNED, expiresAt: new Date("2026-05-26T00:00:00Z") },
        now
      )
    ).toBe("warning");
  });

  it("flags past expiries as expired", () => {
    expect(
      getBaaExpiryState(
        { status: BaaStatus.SIGNED, expiresAt: new Date("2026-05-01T00:00:00Z") },
        now
      )
    ).toBe("expired");
  });

  it("does not highlight not-required rows", () => {
    expect(
      getBaaExpiryState(
        { status: BaaStatus.NOT_REQUIRED, expiresAt: null },
        now
      )
    ).toBe("none");
  });
});

describe("getBaaReminderDay", () => {
  const now = new Date("2026-05-12T12:00:00Z");

  it("matches the configured reminder windows", () => {
    expect(BAA_REMINDER_DAYS).toEqual([30, 14, 7, 0]);
    expect(
      getBaaReminderDay(
        { status: BaaStatus.SIGNED, expiresAt: new Date("2026-06-11T00:00:00Z") },
        now
      )
    ).toBe(30);
    expect(
      getBaaReminderDay(
        { status: BaaStatus.SIGNED, expiresAt: new Date("2026-05-12T00:00:00Z") },
        now
      )
    ).toBe(0);
  });

  it("skips not-required rows", () => {
    expect(
      getBaaReminderDay(
        { status: BaaStatus.NOT_REQUIRED, expiresAt: new Date("2026-06-11T00:00:00Z") },
        now
      )
    ).toBeNull();
  });
});

describe("sortBaaRecords", () => {
  const now = new Date("2026-05-12T12:00:00Z");

  const rows = [
    {
      vendorName: "Okta",
      status: BaaStatus.SIGNED,
      expiresAt: new Date("2027-04-01T00:00:00Z"),
    },
    {
      vendorName: "Google Workspace",
      status: BaaStatus.SIGNED,
      expiresAt: new Date("2026-05-01T00:00:00Z"),
    },
    {
      vendorName: "Zoom",
      status: BaaStatus.SIGNED,
      expiresAt: new Date("2026-05-20T00:00:00Z"),
    },
    {
      vendorName: "Stripe",
      status: BaaStatus.NOT_REQUIRED,
      expiresAt: null,
    },
  ];

  it("sorts expired first, then ascending expiry, then undated rows", () => {
    const sorted = sortBaaRecords(rows, now);
    expect(sorted.map((row) => row.vendorName)).toEqual([
      "Google Workspace",
      "Zoom",
      "Okta",
      "Stripe",
    ]);
  });

  it("compares vendor names for equal expiry buckets", () => {
    expect(
      baaSortCompare(
        { vendorName: "Acme", status: BaaStatus.NOT_REQUIRED, expiresAt: null },
        { vendorName: "Zenith", status: BaaStatus.NOT_REQUIRED, expiresAt: null },
        now
      )
    ).toBeLessThan(0);
  });
});
