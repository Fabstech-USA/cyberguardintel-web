/**
 * Full HIPAA Security Rule catalog for risk-assessment wizard step 3.
 * Each entry maps 1:1 to a seeded `FrameworkControl.controlRef` so checked
 * items can be mirrored to `OrgControl.status=IMPLEMENTED` and fed to AI.
 *
 * Wizard id === controlRef (stable citation string).
 */

import catalog from "../../prisma/data/hipaa-security-rule-controls-3.json";
import { SAFEGUARD_BUCKETS, bucketForCategory } from "@/lib/dashboard-safeguards";
import type { SafeguardBucket } from "@/lib/dashboard-safeguards";

type CatalogRow = (typeof catalog)["controls"][number];

export type WizardControl = {
  /** Same as controlRef. */
  id: string;
  label: string;
  description: string;
  controlRef: string;
  category: string;
  safeguard: SafeguardBucket;
  isRequired: boolean;
};

/** @deprecated Prefer controlRef-as-id. Kept for older clients that still POST short ids. */
export const LEGACY_WIZARD_ID_TO_REF: Readonly<Record<string, string>> = {
  mfa: "164.312(d)",
  encryption_at_rest: "164.312(a)(2)(iv)",
  tls_in_transit: "164.312(e)(2)(ii)",
  audit_logging: "164.312(b)",
  workforce_training: "164.308(a)(5)(ii)(A)",
  access_reviews: "164.308(a)(4)(ii)(C)",
  incident_response: "164.308(a)(6)(ii)",
  backup_recovery: "164.308(a)(7)(ii)(A)",
  baa_signed: "164.314(a)(2)(i)-(iii)",
};

export const WIZARD_CONTROLS: ReadonlyArray<WizardControl> = (
  catalog.controls as CatalogRow[]
).map((row) => ({
  id: row.controlRef,
  label: row.title,
  description: row.guidance,
  controlRef: row.controlRef,
  category: row.category,
  safeguard: bucketForCategory(row.category),
  isRequired: row.isRequired,
}));

export type WizardControlId = (typeof WIZARD_CONTROLS)[number]["id"];

export const WIZARD_CONTROL_IDS: ReadonlyArray<WizardControlId> =
  WIZARD_CONTROLS.map((c) => c.id);

const BY_ID = new Map<string, WizardControl>(
  WIZARD_CONTROLS.map((c) => [c.id, c])
);

const BY_REF = new Map<string, WizardControl>(
  WIZARD_CONTROLS.map((c) => [c.controlRef, c])
);

export function isWizardControlId(value: string): value is WizardControlId {
  return BY_ID.has(value);
}

/** Normalize wizard ids: accept controlRef or legacy short slug. */
export function normalizeWizardControlId(value: string): WizardControlId | null {
  if (BY_ID.has(value)) return value;
  const fromLegacy = LEGACY_WIZARD_ID_TO_REF[value];
  if (fromLegacy && BY_ID.has(fromLegacy)) return fromLegacy;
  return null;
}

export function normalizeWizardControlIds(
  values: ReadonlyArray<string>
): WizardControlId[] {
  const out: WizardControlId[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const id = normalizeWizardControlId(value);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function getWizardControl(id: WizardControlId): WizardControl {
  const c = BY_ID.get(id);
  if (!c) throw new Error(`Unknown wizard control id: ${id}`);
  return c;
}

export function getWizardControlByRef(
  controlRef: string
): WizardControl | undefined {
  return BY_REF.get(controlRef);
}

export function groupWizardControlsBySafeguard(): Array<{
  bucket: SafeguardBucket;
  controls: WizardControl[];
}> {
  return SAFEGUARD_BUCKETS.map((bucket) => ({
    bucket,
    controls: WIZARD_CONTROLS.filter((c) => c.safeguard === bucket),
  })).filter((group) => group.controls.length > 0);
}

/**
 * Confirmed / not-confirmed summary for risk-assessment AI context.
 * Confirmed entries include title + ref; not-confirmed uses refs only to limit size.
 */
export function formatWizardSafeguardsForAi(
  implementedControlIds: ReadonlyArray<string>
): string {
  const implemented = new Set(normalizeWizardControlIds(implementedControlIds));
  const confirmed = WIZARD_CONTROLS.filter((c) => implemented.has(c.id)).map(
    (c) => `${c.label} (${c.controlRef})`
  );
  const notConfirmed = WIZARD_CONTROLS.filter((c) => !implemented.has(c.id)).map(
    (c) => c.controlRef
  );

  return [
    `Safeguards confirmed by organization (${confirmed.length}/${WIZARD_CONTROLS.length}): ${
      confirmed.length > 0 ? confirmed.join("; ") : "None"
    }`,
    `Safeguards not confirmed (${notConfirmed.length}/${WIZARD_CONTROLS.length}): ${
      notConfirmed.length > 0 ? notConfirmed.join(", ") : "None"
    }`,
  ].join(". ");
}
