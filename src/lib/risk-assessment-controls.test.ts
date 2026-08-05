import { describe, expect, it } from "vitest";
import catalog from "../../prisma/data/hipaa-security-rule-controls-3.json";
import {
  LEGACY_WIZARD_ID_TO_REF,
  WIZARD_CONTROLS,
  WIZARD_CONTROL_IDS,
  formatWizardSafeguardsForAi,
  getWizardControl,
  getWizardControlByRef,
  groupWizardControlsBySafeguard,
  normalizeWizardControlId,
  normalizeWizardControlIds,
} from "./risk-assessment-controls";

type CatalogRow = (typeof catalog)["controls"][number];
const catalogRefs = new Set<string>(
  (catalog.controls as CatalogRow[]).map((c) => c.controlRef)
);

describe("WIZARD_CONTROLS", () => {
  it("includes every seeded HIPAA Security Rule control", () => {
    expect(WIZARD_CONTROLS).toHaveLength(catalog.controls.length);
    expect(WIZARD_CONTROLS.length).toBe(48);
  });

  it("uses controlRef as the wizard id", () => {
    for (const wc of WIZARD_CONTROLS) {
      expect(wc.id).toBe(wc.controlRef);
    }
  });

  it("uses unique ids and controlRefs", () => {
    expect(new Set(WIZARD_CONTROL_IDS).size).toBe(WIZARD_CONTROL_IDS.length);
    expect(new Set(WIZARD_CONTROLS.map((c) => c.controlRef)).size).toBe(
      WIZARD_CONTROLS.length
    );
  });

  it("each controlRef exists in the seeded catalog", () => {
    for (const wc of WIZARD_CONTROLS) {
      expect(catalogRefs.has(wc.controlRef)).toBe(true);
    }
  });

  it("groups by all four safeguard buckets", () => {
    const groups = groupWizardControlsBySafeguard();
    expect(groups.map((g) => g.bucket)).toEqual([
      "Administrative",
      "Physical",
      "Technical",
      "Organizational",
    ]);
    expect(groups.reduce((sum, g) => sum + g.controls.length, 0)).toBe(48);
  });

  it("getWizardControl looks up by controlRef id", () => {
    expect(getWizardControl("164.312(d)").label).toBe(
      "Person or Entity Authentication"
    );
  });

  it("getWizardControl throws on unknown id", () => {
    expect(() => getWizardControl("not_a_control")).toThrow();
  });

  it("getWizardControlByRef returns the matching control or undefined", () => {
    expect(getWizardControlByRef("164.312(d)")?.id).toBe("164.312(d)");
    expect(getWizardControlByRef("999.999")).toBeUndefined();
  });

  it("normalizes legacy short wizard ids", () => {
    expect(normalizeWizardControlId("mfa")).toBe(LEGACY_WIZARD_ID_TO_REF.mfa);
    expect(normalizeWizardControlIds(["mfa", "164.312(d)", "nope"])).toEqual([
      "164.312(d)",
    ]);
  });
});

describe("formatWizardSafeguardsForAi", () => {
  it("lists all as not confirmed when none are selected", () => {
    const text = formatWizardSafeguardsForAi([]);
    expect(text).toContain(
      "Safeguards confirmed by organization (0/48): None"
    );
    expect(text).toContain("Safeguards not confirmed (48/48):");
    expect(text).toContain("164.312(d)");
  });

  it("lists confirmed titles and not-confirmed refs", () => {
    const text = formatWizardSafeguardsForAi([
      "164.312(d)",
      "164.314(a)(2)(i)-(iii)",
    ]);
    expect(text).toContain("Safeguards confirmed by organization (2/48):");
    expect(text).toContain("Person or Entity Authentication (164.312(d))");
    expect(text).toContain(
      "Business Associate Contracts or Other Arrangements (164.314(a)(2)(i)-(iii))"
    );
    expect(text).toContain("Safeguards not confirmed (46/48):");
  });

  it("lists none not-confirmed when all are selected", () => {
    const text = formatWizardSafeguardsForAi([...WIZARD_CONTROL_IDS]);
    expect(text).toContain("Safeguards confirmed by organization (48/48):");
    expect(text).toContain("Safeguards not confirmed (0/48): None");
  });

  it("accepts legacy short ids in the AI formatter", () => {
    const text = formatWizardSafeguardsForAi(["mfa"]);
    expect(text).toContain("Safeguards confirmed by organization (1/48):");
    expect(text).toContain("164.312(d)");
  });
});
