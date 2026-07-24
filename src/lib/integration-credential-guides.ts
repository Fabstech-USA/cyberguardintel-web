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
      "In AWS IAM, create a dedicated user (e.g. cyberguardintel-readonly). Do not use your root account.",
      "Attach read-only policies for IAM, CloudTrail, S3, EC2 (security groups), and GuardDuty. AWS managed ReadOnlyAccess works for demos; tighten for production.",
      "Open the user → Security credentials → Create access key → choose Application running outside AWS.",
      "Copy the Access key ID and Secret access key once (the secret is only shown at creation).",
      "Select your default AWS region from the list below (e.g. US East, us-east-1).",
    ],
    docsUrl:
      "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html",
    docsLabel: "AWS access keys docs",
  },
  [DEMO_AWS_ID]: {
    title: "Demo AWS credentials",
    steps: [
      "Demo mode is on. Sample access keys are prefilled so you can connect without a real AWS account.",
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
      "Copy the token and paste it below. Store a backup in your vault. It may only be shown once.",
    ],
    docsUrl: "https://developer.1password.com/docs/events-api/setup/",
    docsLabel: "1Password Events API setup",
  },
  digitalocean: {
    title: "How to create a DigitalOcean API token",
    steps: [
      "Sign in to the DigitalOcean control panel.",
      "Open API in the left nav, then generate a new personal access token.",
      "Grant read scopes only. CyberGuardIntel does not need write access.",
      "Copy the token immediately and paste it below.",
    ],
    docsUrl: "https://docs.digitalocean.com/reference/api/create-personal-access-token/",
    docsLabel: "DigitalOcean API token docs",
  },
  cloudflare: {
    title: "How to create a Cloudflare API token",
    steps: [
      "Sign in to the Cloudflare dashboard and open My Profile, then API Tokens.",
      "Create a token with read permissions for Zone settings, Zone WAF, and Account Audit Logs.",
      "Copy the token and your Account ID from the account home overview.",
      "Paste both values below.",
    ],
    docsUrl: "https://developers.cloudflare.com/fundamentals/api/get-started/create-token/",
    docsLabel: "Cloudflare API token docs",
  },
  datadog: {
    title: "How to create Datadog API and application keys",
    steps: [
      "Sign in to Datadog and open Organization Settings.",
      "Create an API key under API Keys.",
      "Create an application key under Application Keys with read access to monitors and logs.",
      "If your org uses an EU or other regional site, set the site field (for example datadoghq.eu).",
    ],
    docsUrl: "https://docs.datadoghq.com/account_management/api-app-keys/",
    docsLabel: "Datadog API and app keys",
  },
  twilio: {
    title: "How to find your Twilio Account SID and Auth Token",
    steps: [
      "Sign in to the Twilio Console.",
      "Open Account, then API keys and tokens (or the account dashboard).",
      "Copy the Account SID and the Auth Token for this account.",
      "Prefer a restricted API key with read permissions when available.",
    ],
    docsUrl: "https://www.twilio.com/docs/iam/api",
    docsLabel: "Twilio API credentials",
  },
  snyk: {
    title: "How to create a Snyk API token",
    steps: [
      "Sign in to Snyk and open Account Settings, then General.",
      "Generate or copy your personal API token.",
      "Optionally paste your Organization ID if you want evidence scoped to one org.",
      "Use a service account token with read access when your plan supports it.",
    ],
    docsUrl: "https://docs.snyk.io/snyk-api/authentication-for-api",
    docsLabel: "Snyk API authentication",
  },
  jumpcloud: {
    title: "How to create a JumpCloud API key",
    steps: [
      "Sign in to the JumpCloud Admin Portal as an administrator.",
      "Open your admin profile or API Settings and create an API key.",
      "Grant read access to users and systems.",
      "Copy the key and paste it below.",
    ],
    docsUrl: "https://docs.jumpcloud.com/api/1.0/authentication/",
    docsLabel: "JumpCloud API authentication",
  },
  bamboohr: {
    title: "How to create a BambooHR API key",
    steps: [
      "Sign in to BambooHR as an admin.",
      "Open your user menu, then API Keys, and generate a new key.",
      "Enter your company subdomain only (acme from acme.bamboohr.com).",
      "Paste the API key below. Store a backup. Keys are often shown once.",
    ],
    docsUrl: "https://documentation.bamboohr.com/docs/getting-started",
    docsLabel: "BambooHR API getting started",
  },
  backblaze: {
    title: "How to create a Backblaze B2 application key",
    steps: [
      "Sign in to Backblaze and open App Keys under B2 Cloud Storage.",
      "Create a new application key with read bucket and list file permissions.",
      "Copy the keyID and applicationKey immediately.",
      "Paste both values below.",
    ],
    docsUrl: "https://www.backblaze.com/apidocs/b2-create-key",
    docsLabel: "Backblaze B2 application keys",
  },
};

const GENERIC_GUIDE: CredentialSetupGuide = {
  title: "How to create credentials",
  steps: [
    "In the provider’s admin console, create an API key or token dedicated to CyberGuardIntel.",
    "Grant read-only / reporting permissions only. We never need write access.",
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
