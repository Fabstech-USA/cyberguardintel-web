export type IntegrationCategory =
  | "cloud"
  | "identity"
  | "productivity"
  | "communication"
  | "storage"
  | "engineering"
  | "security"
  | "hr"
  | "healthcare";

export type IntegrationAuthMethod =
  | "OAuth 2.0"
  | "API Key"
  | "API Token"
  | "IAM"
  | "OAuth App"
  | "Service account";

export type IntegrationCatalogEntry = {
  id: string;
  name: string;
  category: IntegrationCategory;
  letter: string;
  color: string;
  bg: string;
  description: string;
  controls: string[];
  authMethod: IntegrationAuthMethod;
  permissions: string[];
  connectable: boolean;
};

export type IntegrationCategoryFilter = IntegrationCategory | "all";

export const CONNECTABLE_INTEGRATION_IDS = new Set([
  "aws",
  "google-workspace",
  "microsoft-365",
  "okta",
  "github",
  "slack",
  "zoom",
  "dropbox",
  "box",
  "1password",
]);

const DEFAULT_PERMISSIONS = (name: string): string[] => [
  `Read-only access — we never modify data in ${name}`,
  "Credentials encrypted with AES-256-GCM at rest",
  "Automatic sync every 24 hours, with manual refresh available",
  "Disconnect anytime from this page — all credentials are purged",
];

const OAUTH_AUTH_METHODS: IntegrationAuthMethod[] = ["OAuth 2.0", "OAuth App"];

export function isOAuthAuthMethod(method: IntegrationAuthMethod): boolean {
  return OAUTH_AUTH_METHODS.includes(method);
}

type RawCatalogEntry = Omit<IntegrationCatalogEntry, "permissions" | "connectable">;

function defineEntry(entry: RawCatalogEntry): IntegrationCatalogEntry {
  return {
    ...entry,
    permissions: DEFAULT_PERMISSIONS(entry.name),
    connectable: CONNECTABLE_INTEGRATION_IDS.has(entry.id),
  };
}

export const INTEGRATION_CATALOG: readonly IntegrationCatalogEntry[] = [
  defineEntry({ id: "aws", name: "AWS", category: "cloud", letter: "A", color: "#FF9900", bg: "#FFF4E0", description: "IAM, CloudTrail, S3, GuardDuty", controls: ["164.312(a)(1)", "164.312(b)", "164.312(c)(1)", "164.312(e)(1)"], authMethod: "IAM" }),
  defineEntry({ id: "gcp", name: "Google Cloud", category: "cloud", letter: "G", color: "#4285F4", bg: "#E6F1FB", description: "IAM, Cloud Audit Logs, Cloud KMS", controls: ["164.312(a)(1)", "164.312(b)"], authMethod: "Service account" }),
  defineEntry({ id: "azure", name: "Microsoft Azure", category: "cloud", letter: "Z", color: "#0078D4", bg: "#E6F1FB", description: "Entra ID, Defender, Activity Log", controls: ["164.312(a)(1)", "164.312(b)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "digitalocean", name: "DigitalOcean", category: "cloud", letter: "D", color: "#0080FF", bg: "#E6F1FB", description: "Droplets, Spaces, firewalls", controls: ["164.312(a)(1)"], authMethod: "API Token" }),
  defineEntry({ id: "cloudflare", name: "Cloudflare", category: "cloud", letter: "C", color: "#F38020", bg: "#FFF4E0", description: "WAF rules, TLS config, audit logs", controls: ["164.312(e)(1)"], authMethod: "API Token" }),
  defineEntry({ id: "okta", name: "Okta", category: "identity", letter: "O", color: "#007DC1", bg: "#E6F1FB", description: "SSO, MFA enforcement, provisioning", controls: ["164.312(a)(1)", "164.308(a)(3)"], authMethod: "API Token" }),
  defineEntry({ id: "auth0", name: "Auth0", category: "identity", letter: "A", color: "#EB5424", bg: "#FAECE7", description: "Authentication, MFA, anomaly detection", controls: ["164.312(a)(1)", "164.312(d)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "jumpcloud", name: "JumpCloud", category: "identity", letter: "J", color: "#2ECC40", bg: "#EAF3DE", description: "Directory, device, and access management", controls: ["164.312(a)(1)"], authMethod: "API Key" }),
  defineEntry({ id: "onelogin", name: "OneLogin", category: "identity", letter: "1", color: "#1C1F2A", bg: "#F1EFE8", description: "SSO, SmartFactor authentication", controls: ["164.312(a)(1)", "164.312(d)"], authMethod: "API Token" }),
  defineEntry({ id: "duo", name: "Duo Security", category: "identity", letter: "D", color: "#6BB644", bg: "#EAF3DE", description: "MFA, device trust, zero trust", controls: ["164.312(d)"], authMethod: "API Key" }),
  defineEntry({ id: "google-workspace", name: "Google Workspace", category: "productivity", letter: "G", color: "#4285F4", bg: "#E6F1FB", description: "MFA status, admin roles, sharing controls", controls: ["164.312(a)(1)", "164.308(a)(3)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "microsoft-365", name: "Microsoft 365", category: "productivity", letter: "M", color: "#00A4EF", bg: "#E6F1FB", description: "User lifecycle, MFA, conditional access", controls: ["164.312(a)(1)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "notion", name: "Notion", category: "productivity", letter: "N", color: "#111", bg: "#F1EFE8", description: "Workspace permissions, audit logs", controls: ["164.312(a)(1)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "confluence", name: "Confluence", category: "productivity", letter: "C", color: "#2684FF", bg: "#E6F1FB", description: "Space permissions, restricted pages", controls: ["164.312(a)(1)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "asana", name: "Asana", category: "productivity", letter: "A", color: "#F06A6A", bg: "#FAECE7", description: "Team access, guest permissions", controls: ["164.312(a)(1)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "slack", name: "Slack", category: "communication", letter: "S", color: "#4A154B", bg: "#EEEDFE", description: "Retention, DM policies, data residency", controls: ["164.312(e)(1)", "164.308(a)(6)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "zoom", name: "Zoom", category: "communication", letter: "Z", color: "#2D8CFF", bg: "#E6F1FB", description: "Encryption, recording retention, BAA", controls: ["164.312(e)(1)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "teams", name: "Microsoft Teams", category: "communication", letter: "T", color: "#6264A7", bg: "#EEEDFE", description: "Meeting policies, retention, compliance", controls: ["164.312(e)(1)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "twilio", name: "Twilio", category: "communication", letter: "T", color: "#F22F46", bg: "#FCEBEB", description: "SMS/voice BAA, HIPAA-eligible tier", controls: ["164.312(e)(1)"], authMethod: "API Key" }),
  defineEntry({ id: "intercom", name: "Intercom", category: "communication", letter: "I", color: "#1F8DED", bg: "#E6F1FB", description: "Data retention, access controls", controls: ["164.312(e)(1)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "dropbox", name: "Dropbox Business", category: "storage", letter: "D", color: "#0061FF", bg: "#E6F1FB", description: "Shared drive access, file integrity", controls: ["164.312(a)(1)", "164.312(c)(1)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "box", name: "Box", category: "storage", letter: "B", color: "#0061D5", bg: "#E6F1FB", description: "External sharing, version history", controls: ["164.312(a)(1)", "164.312(c)(1)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "onedrive", name: "OneDrive", category: "storage", letter: "O", color: "#0078D4", bg: "#E6F1FB", description: "Sharing policies, retention", controls: ["164.312(a)(1)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "egnyte", name: "Egnyte", category: "storage", letter: "E", color: "#00a39d", bg: "#E1F5EE", description: "HIPAA-compliant file sharing", controls: ["164.312(a)(1)", "164.312(e)(2)(ii)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "backblaze", name: "Backblaze B2", category: "storage", letter: "B", color: "#E8322A", bg: "#FCEBEB", description: "Backup verification, encryption", controls: ["164.308(a)(7)"], authMethod: "API Key" }),
  defineEntry({ id: "github", name: "GitHub", category: "engineering", letter: "G", color: "#24292E", bg: "#F1EFE8", description: "Commit history, PR approvals, code backup", controls: ["164.308(a)(7)", "164.312(b)"], authMethod: "OAuth App" }),
  defineEntry({ id: "gitlab", name: "GitLab", category: "engineering", letter: "G", color: "#FC6D26", bg: "#FAEEDA", description: "Repo access, merge requests, audit events", controls: ["164.308(a)(7)", "164.312(b)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "bitbucket", name: "Bitbucket", category: "engineering", letter: "B", color: "#2684FF", bg: "#E6F1FB", description: "Repository permissions, branch policies", controls: ["164.312(a)(1)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "jira", name: "Jira", category: "engineering", letter: "J", color: "#0052CC", bg: "#E6F1FB", description: "Change management, incident tickets", controls: ["164.308(a)(6)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "linear", name: "Linear", category: "engineering", letter: "L", color: "#5E6AD2", bg: "#EEEDFE", description: "Workflow history, access controls", controls: ["164.312(a)(1)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "datadog", name: "Datadog", category: "security", letter: "D", color: "#632CA6", bg: "#EEEDFE", description: "Logs, monitoring, APM evidence", controls: ["164.312(b)"], authMethod: "API Key" }),
  defineEntry({ id: "sentry", name: "Sentry", category: "security", letter: "S", color: "#362D59", bg: "#EEEDFE", description: "Error tracking, incident forensics", controls: ["164.308(a)(6)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "crowdstrike", name: "CrowdStrike", category: "security", letter: "F", color: "#FC0000", bg: "#FCEBEB", description: "Endpoint detection, threat intel", controls: ["164.308(a)(5)"], authMethod: "API Key" }),
  defineEntry({ id: "snyk", name: "Snyk", category: "security", letter: "S", color: "#4C4A73", bg: "#EEEDFE", description: "Vulnerability scans, dependency checks", controls: ["164.308(a)(1)"], authMethod: "API Token" }),
  defineEntry({ id: "tenable", name: "Tenable", category: "security", letter: "T", color: "#007EC6", bg: "#E6F1FB", description: "Vulnerability management, scan reports", controls: ["164.308(a)(1)"], authMethod: "API Key" }),
  defineEntry({ id: "pagerduty", name: "PagerDuty", category: "security", letter: "P", color: "#06AC38", bg: "#EAF3DE", description: "Incident response, on-call schedules", controls: ["164.308(a)(6)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "1password", name: "1Password", category: "security", letter: "1", color: "#0572EC", bg: "#E6F1FB", description: "Password policy, MFA enforcement", controls: ["164.308(a)(5)"], authMethod: "API Key" }),
  defineEntry({ id: "bitwarden", name: "Bitwarden", category: "security", letter: "B", color: "#175DDC", bg: "#E6F1FB", description: "Vault policies, access audit", controls: ["164.308(a)(5)"], authMethod: "API Key" }),
  defineEntry({ id: "lastpass", name: "LastPass", category: "security", letter: "L", color: "#D32D27", bg: "#FCEBEB", description: "Password vault, MFA enforcement", controls: ["164.308(a)(5)"], authMethod: "API Key" }),
  defineEntry({ id: "bamboohr", name: "BambooHR", category: "hr", letter: "B", color: "#73C41D", bg: "#EAF3DE", description: "Employee lifecycle, offboarding", controls: ["164.308(a)(3)"], authMethod: "API Key" }),
  defineEntry({ id: "rippling", name: "Rippling", category: "hr", letter: "R", color: "#FFC043", bg: "#FAEEDA", description: "Onboarding, termination, device issuance", controls: ["164.308(a)(3)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "gusto", name: "Gusto", category: "hr", letter: "G", color: "#F26E4D", bg: "#FAECE7", description: "Employee records, payroll access", controls: ["164.308(a)(3)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "workday", name: "Workday", category: "hr", letter: "W", color: "#0875E1", bg: "#E6F1FB", description: "Workforce records, role assignments", controls: ["164.308(a)(3)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "deel", name: "Deel", category: "hr", letter: "D", color: "#15172B", bg: "#F1EFE8", description: "Contractor agreements, BAA tracking", controls: ["164.308(b)(1)"], authMethod: "API Key" }),
  defineEntry({ id: "epic", name: "Epic EHR", category: "healthcare", letter: "E", color: "#D22630", bg: "#FCEBEB", description: "EHR access logs, audit trails", controls: ["164.312(b)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "athena", name: "Athenahealth", category: "healthcare", letter: "A", color: "#482A7F", bg: "#EEEDFE", description: "Clinical data access, audit logs", controls: ["164.312(b)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "cerner", name: "Oracle Cerner", category: "healthcare", letter: "C", color: "#C74634", bg: "#FCEBEB", description: "EHR audit, user access reports", controls: ["164.312(b)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "drchrono", name: "DrChrono", category: "healthcare", letter: "D", color: "#1EAEDB", bg: "#E6F1FB", description: "EHR access, prescription logs", controls: ["164.312(b)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "quickbooks", name: "QuickBooks Health", category: "healthcare", letter: "Q", color: "#2CA01C", bg: "#EAF3DE", description: "Billing, insurance claims access", controls: ["164.312(b)"], authMethod: "OAuth 2.0" }),
  defineEntry({ id: "doxy", name: "Doxy.me", category: "healthcare", letter: "D", color: "#18B0A5", bg: "#E1F5EE", description: "Telehealth sessions, BAA", controls: ["164.312(e)(1)"], authMethod: "API Key" }),
] as const;

export const INTEGRATION_CATEGORIES: readonly {
  id: IntegrationCategoryFilter;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "cloud", label: "Cloud" },
  { id: "identity", label: "Identity & access" },
  { id: "productivity", label: "Productivity" },
  { id: "communication", label: "Communication" },
  { id: "storage", label: "Storage & backup" },
  { id: "engineering", label: "Engineering" },
  { id: "security", label: "Security" },
  { id: "hr", label: "HR & people" },
  { id: "healthcare", label: "Healthcare" },
] as const;

const CATEGORY_LABELS: Record<IntegrationCategory, string> = {
  cloud: "Cloud",
  identity: "Identity & access",
  productivity: "Productivity",
  communication: "Communication",
  storage: "Storage & backup",
  engineering: "Engineering",
  security: "Security",
  hr: "HR & people",
  healthcare: "Healthcare",
};

export function getCategoryLabel(category: IntegrationCategory): string {
  return CATEGORY_LABELS[category];
}

export function getCatalogEntry(id: string): IntegrationCatalogEntry | undefined {
  return INTEGRATION_CATALOG.find((entry) => entry.id === id);
}

export type CatalogFilterOptions = {
  search?: string;
  category?: IntegrationCategoryFilter;
};

export function matchesCatalogSearch(
  entry: IntegrationCatalogEntry,
  search: string
): boolean {
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return (
    entry.name.toLowerCase().includes(needle) ||
    entry.description.toLowerCase().includes(needle) ||
    entry.controls.some((control) => control.toLowerCase().includes(needle))
  );
}

export function filterCatalog(
  entries: readonly IntegrationCatalogEntry[],
  options: CatalogFilterOptions
): IntegrationCatalogEntry[] {
  const category = options.category ?? "all";
  return entries.filter((entry) => {
    if (category !== "all" && entry.category !== category) return false;
    return matchesCatalogSearch(entry, options.search ?? "");
  });
}

export function countCatalogByCategory(
  entries: readonly IntegrationCatalogEntry[]
): Record<IntegrationCategoryFilter, number> {
  const counts: Record<IntegrationCategoryFilter, number> = {
    all: entries.length,
    cloud: 0,
    identity: 0,
    productivity: 0,
    communication: 0,
    storage: 0,
    engineering: 0,
    security: 0,
    hr: 0,
    healthcare: 0,
  };
  for (const entry of entries) {
    counts[entry.category] += 1;
  }
  return counts;
}

export function groupAvailableByCategory(
  entries: IntegrationCatalogEntry[]
): { category: IntegrationCategory; label: string; entries: IntegrationCatalogEntry[] }[] {
  const groups = new Map<IntegrationCategory, IntegrationCatalogEntry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.category) ?? [];
    list.push(entry);
    groups.set(entry.category, list);
  }
  return INTEGRATION_CATEGORIES.filter((c) => c.id !== "all")
    .map((c) => c.id as IntegrationCategory)
    .filter((category) => groups.has(category))
    .map((category) => ({
      category,
      label: getCategoryLabel(category),
      entries: groups.get(category) ?? [],
    }));
}

export function getConnectHref(entry: IntegrationCatalogEntry): string {
  if (isOAuthAuthMethod(entry.authMethod)) {
    return `/api/integrations/${entry.id}/auth`;
  }
  return `/integrations/connect/${entry.id}`;
}
