/**
 * Gated demo integrations for stakeholder demos (no real AWS / Google APIs).
 * DB `type` values map to the Python stub connector with fixture profiles.
 */

export const DEMO_AWS_ID = "demo-aws";
export const DEMO_GOOGLE_WORKSPACE_ID = "demo-google-workspace";

export const DEMO_INTEGRATION_IDS = new Set([
  DEMO_AWS_ID,
  DEMO_GOOGLE_WORKSPACE_ID,
]);

/** Real catalog ids replaced by demo stubs when demo mode is on. */
export const DEMO_REPLACES_CATALOG_IDS = new Set(["aws", "google-workspace"]);

export const DEMO_AWS_PREFILL = {
  access_key_id: "AKIAIOSFODNN7EXAMPLE",
  secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  region: "us-east-1",
} as const;

/**
 * Demo integrations are enabled when:
 * - `NEXT_PUBLIC_DEMO_INTEGRATIONS_ENABLED=true`, or
 * - `DEMO_INTEGRATIONS_ENABLED=true` (server-only), or
 * - `NODE_ENV !== "production"` unless explicitly set to `"false"`.
 */
export function isDemoIntegrationsEnabled(): boolean {
  const explicit =
    process.env.NEXT_PUBLIC_DEMO_INTEGRATIONS_ENABLED ??
    process.env.DEMO_INTEGRATIONS_ENABLED;
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export function isDemoIntegrationType(type: string): boolean {
  return DEMO_INTEGRATION_IDS.has(type);
}

export function isDemoOAuthIntegrationType(type: string): boolean {
  return type === DEMO_GOOGLE_WORKSPACE_ID;
}

export function isDemoIamIntegrationType(type: string): boolean {
  return type === DEMO_AWS_ID;
}

export function getDemoIntegrationProfile(type: string): string {
  if (type === DEMO_AWS_ID) return "aws";
  if (type === DEMO_GOOGLE_WORKSPACE_ID) return "google-workspace";
  return "generic";
}

export function getDemoIntegrationConfig(type: string): Record<string, unknown> {
  return {
    fixture: true,
    profile: getDemoIntegrationProfile(type),
  };
}

export function getDemoIntegrationIconId(type: string): string | undefined {
  if (type === DEMO_AWS_ID) return "aws";
  if (type === DEMO_GOOGLE_WORKSPACE_ID) return "google-workspace";
  return undefined;
}
