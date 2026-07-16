import { describe, expect, it } from "vitest";
import { withoutDashPunctuation } from "@/lib/help-copy";

describe("withoutDashPunctuation", () => {
  it("replaces em dashes with a period", () => {
    expect(
      withoutDashPunctuation("Touches ePHI — EHR, billing, and email.")
    ).toBe("Touches ePHI. EHR, billing, and email.");
  });

  it("rewrites numeric en dash ranges with to", () => {
    expect(withoutDashPunctuation("Score 0–100")).toBe("Score 0 to 100");
  });

  it("replaces spaced hyphens used as dashes", () => {
    expect(withoutDashPunctuation("Done - then review")).toBe(
      "Done. then review"
    );
  });

  it("keeps hyphenated compounds without surrounding spaces", () => {
    expect(withoutDashPunctuation("Use on-premises servers.")).toBe(
      "Use on-premises servers."
    );
  });
});
