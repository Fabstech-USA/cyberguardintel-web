/**
 * Field definitions for API-key/token integrations connected via the
 * credential form (non-OAuth). Keys match what the Python connectors expect.
 */

import {
  DEMO_AWS_ID,
  DEMO_AWS_PREFILL,
} from "@/lib/demo-integrations";

export type CredentialFieldOption = {
  value: string;
  label: string;
};

export type CredentialField = {
  key: string;
  label: string;
  inputType?: "text" | "password";
  placeholder?: string;
  defaultValue?: string;
  /** When set, render a select instead of a free-text input. */
  options?: CredentialFieldOption[];
};

/** Common commercial AWS regions used for evidence collection. */
export const AWS_REGION_OPTIONS: CredentialFieldOption[] = [
  { value: "us-east-1", label: "US East (N. Virginia) · us-east-1" },
  { value: "us-east-2", label: "US East (Ohio) · us-east-2" },
  { value: "us-west-1", label: "US West (N. California) · us-west-1" },
  { value: "us-west-2", label: "US West (Oregon) · us-west-2" },
  { value: "ca-central-1", label: "Canada (Central) · ca-central-1" },
  { value: "ca-west-1", label: "Canada West (Calgary) · ca-west-1" },
  { value: "eu-west-1", label: "Europe (Ireland) · eu-west-1" },
  { value: "eu-west-2", label: "Europe (London) · eu-west-2" },
  { value: "eu-west-3", label: "Europe (Paris) · eu-west-3" },
  { value: "eu-central-1", label: "Europe (Frankfurt) · eu-central-1" },
  { value: "eu-central-2", label: "Europe (Zurich) · eu-central-2" },
  { value: "eu-north-1", label: "Europe (Stockholm) · eu-north-1" },
  { value: "eu-south-1", label: "Europe (Milan) · eu-south-1" },
  { value: "eu-south-2", label: "Europe (Spain) · eu-south-2" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo) · ap-northeast-1" },
  { value: "ap-northeast-2", label: "Asia Pacific (Seoul) · ap-northeast-2" },
  { value: "ap-northeast-3", label: "Asia Pacific (Osaka) · ap-northeast-3" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore) · ap-southeast-1" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney) · ap-southeast-2" },
  { value: "ap-southeast-3", label: "Asia Pacific (Jakarta) · ap-southeast-3" },
  { value: "ap-southeast-4", label: "Asia Pacific (Melbourne) · ap-southeast-4" },
  { value: "ap-south-1", label: "Asia Pacific (Mumbai) · ap-south-1" },
  { value: "ap-south-2", label: "Asia Pacific (Hyderabad) · ap-south-2" },
  { value: "ap-east-1", label: "Asia Pacific (Hong Kong) · ap-east-1" },
  { value: "sa-east-1", label: "South America (São Paulo) · sa-east-1" },
  { value: "af-south-1", label: "Africa (Cape Town) · af-south-1" },
  { value: "me-south-1", label: "Middle East (Bahrain) · me-south-1" },
  { value: "me-central-1", label: "Middle East (UAE) · me-central-1" },
  { value: "il-central-1", label: "Israel (Tel Aviv) · il-central-1" },
];

const AWS_REGION_FIELD: CredentialField = {
  key: "region",
  label: "Region",
  defaultValue: "us-east-1",
  options: AWS_REGION_OPTIONS,
};

export const CREDENTIAL_FIELDS: Record<string, CredentialField[]> = {
  aws: [
    { key: "access_key_id", label: "Access key ID" },
    {
      key: "secret_access_key",
      label: "Secret access key",
      inputType: "password",
    },
    AWS_REGION_FIELD,
  ],
  okta: [
    {
      key: "domain",
      label: "Okta domain",
      placeholder: "acme.okta.com",
    },
    { key: "api_token", label: "API token", inputType: "password" },
  ],
  "1password": [
    {
      key: "api_token",
      label: "Events API token",
      inputType: "password",
      placeholder: "Generated in 1Password Business → Integrations",
    },
  ],
};

export function getCredentialFields(type: string): CredentialField[] {
  if (type === DEMO_AWS_ID) {
    return [
      {
        key: "access_key_id",
        label: "Access key ID",
        defaultValue: DEMO_AWS_PREFILL.access_key_id,
      },
      {
        key: "secret_access_key",
        label: "Secret access key",
        inputType: "password",
        defaultValue: DEMO_AWS_PREFILL.secret_access_key,
      },
      {
        ...AWS_REGION_FIELD,
        defaultValue: DEMO_AWS_PREFILL.region,
      },
    ];
  }
  return (
    CREDENTIAL_FIELDS[type] ?? [
      { key: "api_key", label: "API key / token" },
      { key: "api_secret", label: "API secret", inputType: "password" },
    ]
  );
}
