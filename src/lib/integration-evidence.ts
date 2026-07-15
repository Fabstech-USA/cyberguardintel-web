/**
 * Plain-language evidence items shown when a user opens / connects an
 * integration. Connectable types match what the Python connectors collect;
 * others fall back to the catalog description.
 */

import {
  DEMO_AWS_ID,
  DEMO_GOOGLE_WORKSPACE_ID,
} from "@/lib/demo-integrations";

const EVIDENCE_BY_TYPE: Record<string, string[]> = {
  aws: [
    "IAM user inventory",
    "MFA enrollment status",
    "IAM password policy",
    "CloudTrail logging status",
    "S3 bucket encryption status",
    "Security group configuration",
    "GuardDuty threat detection status",
  ],
  [DEMO_AWS_ID]: [
    "IAM user inventory",
    "CloudTrail logging status",
    "S3 bucket encryption report",
  ],
  "google-workspace": [
    "User inventory with MFA status",
    "Admin role assignments",
    "External sharing posture",
    "Workspace security settings summary",
  ],
  [DEMO_GOOGLE_WORKSPACE_ID]: [
    "User inventory",
    "Admin role assignments",
    "External sharing settings",
  ],
  "microsoft-365": [
    "User inventory",
    "MFA registration status",
    "Conditional access policies",
    "Admin role assignments",
  ],
  okta: [
    "User inventory",
    "MFA enrollment gaps",
    "Sign-on policies",
    "Application assignments",
  ],
  github: [
    "Organization security settings",
    "Member 2FA status",
    "Branch protection coverage",
  ],
  slack: [
    "Workspace configuration",
    "Member 2FA status",
    "Workspace admin list",
  ],
  zoom: [
    "Meeting security settings",
    "Recording retention settings",
    "User inventory",
  ],
  dropbox: [
    "Team configuration",
    "Team member inventory",
    "Sharing and feature posture",
  ],
  box: [
    "User inventory",
    "External collaboration allowlist",
    "Retention policies",
  ],
  "1password": [
    "Sign-in attempt history",
    "Item usage / access events",
  ],
  // Coming-soon catalog entries — high-level evidence expectations
  gcp: ["IAM bindings", "Cloud Audit Logs", "Cloud KMS key inventory"],
  azure: ["Entra ID users and roles", "Defender alerts", "Activity Log"],
  digitalocean: ["Droplet inventory", "Spaces access", "Firewall rules"],
  cloudflare: ["WAF rules", "TLS configuration", "Audit logs"],
  auth0: ["Authentication logs", "MFA enrollment", "Anomaly detections"],
  jumpcloud: ["Directory users", "Device inventory", "Access policies"],
  onelogin: ["SSO configuration", "MFA status", "User provisioning"],
  duo: ["MFA enrollments", "Device trust status", "Authentication logs"],
  notion: ["Workspace permissions", "Audit logs"],
  confluence: ["Space permissions", "Restricted page inventory"],
  asana: ["Team access", "Guest permissions"],
  teams: ["Meeting policies", "Retention settings", "Compliance config"],
  twilio: ["HIPAA-eligible tier status", "Account security settings"],
  intercom: ["Data retention settings", "Access controls"],
  onedrive: ["Sharing policies", "Retention settings"],
  egnyte: ["File sharing policies", "Access audit"],
  backblaze: ["Backup verification", "Encryption status"],
  gitlab: ["Repo access", "Merge request policies", "Audit events"],
  bitbucket: ["Repository permissions", "Branch policies"],
  jira: ["Change management tickets", "Incident tickets"],
  linear: ["Workflow history", "Access controls"],
  datadog: ["Monitoring coverage", "Log retention", "APM evidence"],
  sentry: ["Error tracking config", "Incident forensics"],
  crowdstrike: ["Endpoint detection status", "Threat intel coverage"],
  snyk: ["Vulnerability scan results", "Dependency findings"],
  tenable: ["Vulnerability scan reports", "Asset coverage"],
  pagerduty: ["On-call schedules", "Incident response history"],
  bitwarden: ["Vault policies", "Access audit"],
  lastpass: ["Password vault policies", "MFA enforcement"],
  bamboohr: ["Employee lifecycle events", "Offboarding records"],
  rippling: ["Onboarding / termination events", "Device issuance"],
  gusto: ["Employee records access", "Payroll access audit"],
  workday: ["Workforce records", "Role assignments"],
  deel: ["Contractor agreements", "BAA tracking"],
  epic: ["EHR access logs", "Audit trails"],
  athena: ["Clinical data access logs", "Audit logs"],
  cerner: ["EHR audit reports", "User access reports"],
  drchrono: ["EHR access logs", "Prescription logs"],
  quickbooks: ["Billing access", "Insurance claims access"],
  doxy: ["Telehealth session logs", "BAA status"],
};

function fromDescription(description: string): string[] {
  return description
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));
}

/** Evidence items shown on open/connect for an integration type. */
export function getEvidenceCollected(
  type: string,
  descriptionFallback?: string
): string[] {
  const known = EVIDENCE_BY_TYPE[type];
  if (known?.length) return known;
  if (descriptionFallback) return fromDescription(descriptionFallback);
  return [];
}
