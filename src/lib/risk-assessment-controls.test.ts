import { describe, expect, it } from "vitest";
import catalog from "../../prisma/data/hipaa-security-rule-controls-3.json";
import {
  WIZARD_CONTROLS,
  WIZARD_CONTROL_IDS,
  getWizardControl,
  getWizardControlByRef,
} from "./risk-assessment-controls";

type CatalogRow = (typeof catalog)["controls"][number];
const catalogRefs = new Set<string>(
  (catalog.controls as CatalogRow[]).map((c) => c.controlRef)
);

describe("WIZARD_CONTROLS", () => {
  it("has exactly 9 entries (matches the wizard step 3 design)", () => {
    expect(WIZARD_CONTROLS).toHaveLength(9);
  });

  it("uses unique ids", () => {
    const ids = new Set(WIZARD_CONTROL_IDS);
    expect(ids.size).toBe(WIZARD_CONTROL_IDS.length);
  });

  it("uses unique controlRefs", () => {
    const refs = new Set(WIZARD_CONTROLS.map((c) => c.controlRef));
    expect(refs.size).toBe(WIZARD_CONTROLS.length);
  });

  it("each controlRef exists in the seeded HIPAA Security Rule catalog", () => {
    for (const wc of WIZARD_CONTROLS) {
      expect(
        catalogRefs.has(wc.controlRef),
        `Wizard control "${wc.id}" references unknown HIPAA controlRef "${wc.controlRef}"`
      ).toBe(true);
    }
  });

  it("getWizardControl looks up by id", () => {
    expect(getWizardControl("mfa").label).toBe(
      "Multi-factor authentication enforced"
    );
  });

  it("getWizardControl throws on unknown id", () => {
    // Bypass the type system with a clearly bogus id.
    expect(() =>
      getWizardControl(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "not_a_control" as any
      )
    ).toThrow();
  });

  it("getWizardControlByRef returns the matching control or undefined", () => {
    expect(getWizardControlByRef("164.312(d)")?.id).toBe("mfa");
    expect(getWizardControlByRef("999.999")).toBeUndefined();
  });
});
