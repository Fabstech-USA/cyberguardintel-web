import { describe, expect, it } from "vitest";
import {
  aggregateSafeguardScores,
  buildSafeguardBucketSummaries,
  bucketForCategory,
  isSafeguardBucket,
} from "@/lib/dashboard-safeguards";

const now = new Date("2026-05-22T12:00:00Z");

describe("dashboard-safeguards", () => {
  it("maps categories into the four buckets", () => {
    expect(bucketForCategory("Administrative Safeguards")).toBe(
      "Administrative"
    );
    expect(bucketForCategory("Physical")).toBe("Physical");
    expect(bucketForCategory("Technical Safeguards")).toBe("Technical");
    expect(bucketForCategory("Organizational Requirements")).toBe(
      "Organizational"
    );
    expect(bucketForCategory("Other")).toBe("Administrative");
  });

  it("validates safeguard query values", () => {
    expect(isSafeguardBucket("Technical")).toBe(true);
    expect(isSafeguardBucket("All")).toBe(false);
  });

  it("averages scores per bucket", () => {
    const scores = aggregateSafeguardScores([
      { score: 10, category: "Administrative" },
      { score: 30, category: "Administrative" },
      { score: 50, category: "Technical" },
    ]);
    expect(scores.Administrative).toBe(20);
    expect(scores.Technical).toBe(50);
    expect(scores.Physical).toBe(0);
  });

  it("builds available/missing factor counts for hover UI", () => {
    const summaries = buildSafeguardBucketSummaries(
      [
        {
          score: 40,
          category: "Technical",
          ownerId: "u1",
          status: "IMPLEMENTED",
          evidence: [
            {
              expiresAt: new Date("2026-06-01T00:00:00Z"),
              collectedAt: now,
              metadata: null,
            },
            {
              expiresAt: new Date("2026-01-01T00:00:00Z"),
              collectedAt: now,
              metadata: null,
            },
          ],
        },
        {
          score: 0,
          category: "Technical",
          ownerId: null,
          status: "NOT_STARTED",
          evidence: [],
        },
      ],
      { approvedPolicyCount: 9, now }
    );

    const technical = summaries.find((s) => s.bucket === "Technical");
    expect(technical?.controlCount).toBe(2);
    expect(technical?.score).toBe(20);
    expect(technical?.statusMix).toEqual({
      notStarted: 1,
      inProgress: 0,
      implemented: 1,
      needsReview: 0,
      exception: 0,
    });
    expect(technical?.factors).toEqual([
      {
        label: "Evidence on controls",
        available: 1,
        missing: 1,
        unit: "controls",
      },
      {
        label: "Evidence freshness",
        available: 1,
        missing: 1,
        unit: "items",
      },
      {
        label: "Approved policies (org-wide)",
        available: 9,
        missing: 9,
        unit: "policies",
      },
      {
        label: "Control owners",
        available: 1,
        missing: 1,
        unit: "controls",
      },
    ]);
  });
});
