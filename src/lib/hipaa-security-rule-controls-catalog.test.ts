import { describe, expect, it } from "vitest";

import { bucketForCategory } from "@/lib/dashboard-safeguards";

import catalog from "../../prisma/data/hipaa-security-rule-controls-3.json";

type Row = (typeof catalog)["controls"][number];

describe("hipaa-security-rule-controls-3.json catalog", () => {
  it("has unique controlRef values", () => {
    const refs = catalog.controls.map((c: Row) => c.controlRef);
    expect(new Set(refs).size).toBe(refs.length);
  });

  it("has expected control count", () => {
    expect(catalog.controls.length).toBeGreaterThanOrEqual(48);
  });

  it("each row has non-empty strings and boolean isRequired", () => {
    for (const row of catalog.controls as Row[]) {
      expect(row.controlRef.trim().length).toBeGreaterThan(0);
      expect(row.title.trim().length).toBeGreaterThan(0);
      expect(row.category.trim().length).toBeGreaterThan(0);
      expect(row.description.trim().length).toBeGreaterThan(0);
      expect(row.guidance.trim().length).toBeGreaterThan(0);
      expect(row.evidenceHints.trim().length).toBeGreaterThan(0);
      expect(typeof row.isRequired).toBe("boolean");
    }
  });

  it("each category maps to a dashboard safeguard bucket", () => {
    const allowedSubstrings = [
      "administrative",
      "physical",
      "technical",
      "organizational",
    ] as const;

    for (const row of catalog.controls as Row[]) {
      const lower = row.category.toLowerCase();
      const matches = allowedSubstrings.some((s) => lower.includes(s));
      expect(
        matches,
        `category "${row.category}" must include one of: ${allowedSubstrings.join(", ")}`
      ).toBe(true);
      expect(["Administrative", "Physical", "Technical", "Organizational"]).toContain(
        bucketForCategory(row.category)
      );
    }
  });

  it("metadata lists Security Rule sections", () => {
    expect(catalog.metadata.subpart).toBe("C");
    expect(catalog.metadata.scopeSections).toContain("164.308");
    expect(catalog.metadata.scopeSections).toContain("164.312");
  });
});
