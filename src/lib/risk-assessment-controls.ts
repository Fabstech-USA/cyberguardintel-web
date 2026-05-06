/**
 * Hardcoded list of nine high-level safeguards the wizard surfaces in step 3.
 * Each entry maps to a real `FrameworkControl.controlRef` in the seeded HIPAA
 * Security Rule catalog (`prisma/data/hipaa-security-rule-controls-3.json`),
 * which lets the API mirror checked items into `OrgControl.status=IMPLEMENTED`
 * and feed the AI service's `existing_controls` string.
 *
 * The order here is the order the screenshot/wizard renders.
 */

export type WizardControlId =
  | "mfa"
  | "encryption_at_rest"
  | "tls_in_transit"
  | "audit_logging"
  | "workforce_training"
  | "access_reviews"
  | "incident_response"
  | "backup_recovery"
  | "baa_signed";

export type WizardControl = {
  id: WizardControlId;
  label: string;
  description: string;
  controlRef: string;
};

export const WIZARD_CONTROLS: ReadonlyArray<WizardControl> = [
  {
    id: "mfa",
    label: "Multi-factor authentication enforced",
    description: "Required on all accounts accessing PHI",
    controlRef: "164.312(d)",
  },
  {
    id: "encryption_at_rest",
    label: "Encryption at rest",
    description: "AES-256 for databases and object storage",
    controlRef: "164.312(a)(2)(iv)",
  },
  {
    id: "tls_in_transit",
    label: "TLS 1.2+ for data in transit",
    description: "Enforced on all endpoints and APIs",
    controlRef: "164.312(e)(2)(ii)",
  },
  {
    id: "audit_logging",
    label: "Audit logging enabled",
    description: "Every PHI access and modification recorded",
    controlRef: "164.312(b)",
  },
  {
    id: "workforce_training",
    label: "Annual workforce training",
    description: "HIPAA training completed with attestation",
    controlRef: "164.308(a)(5)(ii)(A)",
  },
  {
    id: "access_reviews",
    label: "Quarterly access reviews",
    description: "User permissions reviewed and documented",
    controlRef: "164.308(a)(4)(ii)(C)",
  },
  {
    id: "incident_response",
    label: "Incident response plan documented",
    description: "Breach notification procedures in place",
    controlRef: "164.308(a)(6)(ii)",
  },
  {
    id: "backup_recovery",
    label: "Backup and recovery plan",
    description: "Tested restore procedures with defined RTO/RPO",
    controlRef: "164.308(a)(7)(ii)(A)",
  },
  {
    id: "baa_signed",
    label: "BAAs signed with all vendors",
    description: "Every vendor touching PHI has an executed BAA",
    controlRef: "164.314(a)(2)(i)-(iii)",
  },
];

export const WIZARD_CONTROL_IDS: ReadonlyArray<WizardControlId> =
  WIZARD_CONTROLS.map((c) => c.id);

const BY_ID = new Map<WizardControlId, WizardControl>(
  WIZARD_CONTROLS.map((c) => [c.id, c])
);

const BY_REF = new Map<string, WizardControl>(
  WIZARD_CONTROLS.map((c) => [c.controlRef, c])
);

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
