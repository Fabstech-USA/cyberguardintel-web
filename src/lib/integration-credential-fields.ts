/**
 * Field definitions for API-key/token integrations connected via the
 * credential form (non-OAuth). Keys match what the Python connectors expect.
 */

import {
  DEMO_AWS_ID,
  DEMO_AWS_PREFILL,
} from "@/lib/demo-integrations";

export type CredentialField = {
  key: string;
  label: string;
  inputType?: "text" | "password";
  placeholder?: string;
  defaultValue?: string;
};

export const CREDENTIAL_FIELDS: Record<string, CredentialField[]> = {
  aws: [
    { key: "access_key_id", label: "Access key ID" },
    { key: "secret_access_key", label: "Secret access key", inputType: "password" },
    { key: "region", label: "Region", defaultValue: "us-east-1" },
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
        key: "region",
        label: "Region",
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
