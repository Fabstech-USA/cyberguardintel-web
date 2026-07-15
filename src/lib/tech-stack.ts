/**
 * Organization.techStack is a declared profile of tools the org uses.
 * Connected integrations and PHI systems are merged into that profile
 * (add on connect / PHI declare; remove does not wipe stack entries —
 * the org may still use the tool offline).
 *
 * Pure helpers only — safe for Client Components.
 * DB mutations / merges live in `@/lib/tech-stack-server`.
 */

import {
  DEMO_AWS_ID,
  DEMO_GOOGLE_WORKSPACE_ID,
} from "@/lib/demo-integrations";

/** Preset slugs from onboarding (underscore style). */
export const TECH_STACK_PRESET_VALUES = [
  "aws",
  "google_cloud",
  "azure",
  "google_workspace",
  "microsoft_365",
  "github",
  "okta",
  "slack",
] as const;

export type TechStackPresetValue = (typeof TECH_STACK_PRESET_VALUES)[number];

const PRESET_LABELS: Record<TechStackPresetValue, string> = {
  aws: "AWS",
  google_cloud: "Google Cloud",
  azure: "Azure",
  google_workspace: "Google Workspace",
  microsoft_365: "Microsoft 365",
  github: "GitHub",
  okta: "Okta",
  slack: "Slack",
};

/** Map Integration.type (and demo types) to a stable tech-stack slug. */
const INTEGRATION_TYPE_TO_TECH_STACK: Record<string, string> = {
  aws: "aws",
  [DEMO_AWS_ID]: "aws",
  "google-workspace": "google_workspace",
  [DEMO_GOOGLE_WORKSPACE_ID]: "google_workspace",
  "microsoft-365": "microsoft_365",
  github: "github",
  okta: "okta",
  slack: "slack",
  zoom: "zoom",
  dropbox: "dropbox",
  box: "box",
  "1password": "1password",
};

/** Onboarding PHI system preset slug → tech-stack slug. */
const ONBOARDING_PHI_TO_TECH_STACK: Record<string, string> = {
  epic_ehr: "epic",
  athenahealth: "athena",
  drchrono: "drchrono",
  aws_rds_s3: "aws",
  azure: "azure",
  twilio_sms: "twilio",
  zoom_healthcare: "zoom",
  // "other" intentionally omitted — not a concrete tool
};

/**
 * Known PHI system display names / substrings → tech-stack slug.
 * Longer / more specific patterns should be checked first via order.
 */
const PHI_NAME_PATTERNS: { pattern: RegExp; slug: string }[] = [
  { pattern: /\bepic\b/i, slug: "epic" },
  { pattern: /\bathena/i, slug: "athena" },
  { pattern: /\bdrchrono\b/i, slug: "drchrono" },
  { pattern: /\bcerner\b|\boracle health\b/i, slug: "cerner" },
  { pattern: /\bdoxy\.?me\b/i, slug: "doxy" },
  { pattern: /\baws\b|\brds\b|\bs3\b/i, slug: "aws" },
  { pattern: /\bazure\b/i, slug: "azure" },
  { pattern: /\bgcp\b|\bgoogle cloud\b/i, slug: "google_cloud" },
  { pattern: /\btwilio\b/i, slug: "twilio" },
  { pattern: /\bzoom\b/i, slug: "zoom" },
  { pattern: /\bokta\b/i, slug: "okta" },
  { pattern: /\bslack\b/i, slug: "slack" },
  { pattern: /\bmicrosoft 365\b|\boffice 365\b|\bm365\b/i, slug: "microsoft_365" },
  { pattern: /\bgoogle workspace\b|\bg suite\b/i, slug: "google_workspace" },
  { pattern: /\bdropbox\b/i, slug: "dropbox" },
  { pattern: /\bbox\b/i, slug: "box" },
  { pattern: /\b1password\b/i, slug: "1password" },
  { pattern: /\bgithub\b/i, slug: "github" },
];

const EXTRA_LABELS: Record<string, string> = {
  zoom: "Zoom",
  dropbox: "Dropbox Business",
  box: "Box",
  "1password": "1Password",
  epic: "Epic EHR",
  athena: "Athenahealth",
  drchrono: "DrChrono",
  cerner: "Oracle Cerner",
  twilio: "Twilio",
  doxy: "Doxy.me",
};

export function integrationTypeToTechStackSlug(
  integrationType: string
): string | null {
  const mapped = INTEGRATION_TYPE_TO_TECH_STACK[integrationType];
  if (mapped) return mapped;
  // Unknown connectable types: store catalog id as-is (no empty / demo junk).
  if (!integrationType || integrationType.startsWith("demo-")) return null;
  return integrationType;
}

export function onboardingPhiSlugToTechStackSlug(
  phiPresetSlug: string
): string | null {
  return ONBOARDING_PHI_TO_TECH_STACK[phiPresetSlug] ?? null;
}

/** Map a PHI map system (name + optional type) to a tech-stack slug when recognizable. */
export function phiSystemToTechStackSlug(input: {
  name: string;
  systemType?: string | null;
}): string | null {
  const name = input.name?.trim() ?? "";
  if (!name) return null;

  for (const { pattern, slug } of PHI_NAME_PATTERNS) {
    if (pattern.test(name)) return slug;
  }

  // Fallback: systemType alone is too vague (e.g. "cloud") to pick a vendor.
  return null;
}

export function formatTechStackLabel(slug: string): string {
  if (slug in PRESET_LABELS) {
    return PRESET_LABELS[slug as TechStackPresetValue];
  }
  if (EXTRA_LABELS[slug]) return EXTRA_LABELS[slug];
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function uniqueSortedTechStack(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    formatTechStackLabel(a).localeCompare(formatTechStackLabel(b))
  );
}
