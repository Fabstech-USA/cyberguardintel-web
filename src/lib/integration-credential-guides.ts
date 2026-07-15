/**
 * Step-by-step guidance for generating credentials for non-OAuth integrations.
 */

import {
  DEMO_AWS_ID,
  isDemoIamIntegrationType,
} from "@/lib/demo-integrations";

export type CredentialSetupGuide = {
  title: string;
  steps: string[];
  /** Optional vendor docs link. */
  docsUrl?: string;
  docsLabel?: string;
};

const GUIDES: Record<string, CredentialSetupGuide> = {
  aws: {
    title: "How to create AWS credentials",
    steps: [
      "In AWS IAM, create a dedicated user (e.g. cyberguardintel-readonly) — do not use your root account.",
      "Attach read-only policies for IAM, CloudTrail, S3, EC2 (security groups), and GuardDuty. AWS managed ReadOnlyAccess works for demos; tighten for production.",
      "Open the user → Security credentials → Create access key → choose Application running outside AWS.",
      "Copy the Access key ID and Secret access key once (the secret is only shown at creation).",
      "Select your default AWS region from the list below (e.g. US East — us-east-1).",
    ],
    docsUrl:
      "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html",
    docsLabel: "AWS access keys docs",
  },
  [DEMO_AWS_ID]: {
    title: "Demo AWS credentials",
    steps: [
      "Demo mode is on — sample access keys are prefilled so you can connect without a real AWS account.",
      "In production, create a read-only IAM user and access key as described for the live AWS connector.",
    ],
  },
  okta: {
    title: "How to create an Okta API token",
    steps: [
      "Sign in to the Okta Admin Console as a Super Admin (or an admin with API token privileges).",
      "Go to Security → API → Tokens → Create Token.",
      "Name it something like CyberGuardIntel evidence and copy the token immediately (it is only shown once).",
      "Enter your Okta domain without https:// (e.g. acme.okta.com or acme.oktapreview.com).",
      "Prefer a token from a service account with read-only admin roles when your Okta plan allows it.",
    ],
    docsUrl: "https://developer.okta.com/docs/guides/create-an-api-token/main/",
    docsLabel: "Okta API token docs",
  },
  "1password": {
    title: "How to create a 1Password Events API token",
    steps: [
      "Sign in to 1Password Business (Events API requires a Business or Enterprise plan).",
      "Open Integrations → Events Reporting (or Directory → Events API, depending on your console).",
      "Create a new Events API token with permission to read sign-in attempts and item usage.",
      "Copy the token and paste it below. Store a backup in your vault — it may only be shown once.",
    ],
    docsUrl: "https://developer.1password.com/docs/events-api/setup/",
    docsLabel: "1Password Events API setup",
  },
};

const GENERIC_GUIDE: CredentialSetupGuide = {
  title: "How to create credentials",
  steps: [
    "In the provider’s admin console, create an API key or token dedicated to CyberGuardIntel.",
    "Grant read-only / reporting permissions only — we never need write access.",
    "Copy the key or token immediately (many providers show secrets only once) and paste it below.",
  ],
};

export function getCredentialSetupGuide(
  type: string
): CredentialSetupGuide | null {
  if (GUIDES[type]) return GUIDES[type];
  // OAuth / unknown without a credential form should not show a guide.
  if (isDemoIamIntegrationType(type)) return GUIDES[DEMO_AWS_ID];
  return null;
}

/** Guide for any type that uses the credential form, including generic fallback. */
export function getCredentialSetupGuideOrDefault(
  type: string,
  hasCredentialFields: boolean
): CredentialSetupGuide | null {
  if (!hasCredentialFields) return null;
  return getCredentialSetupGuide(type) ?? GENERIC_GUIDE;
}
