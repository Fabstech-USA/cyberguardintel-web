import { describe, expect, it } from "vitest";

import { DEMO_AWS_ID } from "@/lib/demo-integrations";
import { getCredentialFields } from "@/lib/integration-credential-fields";

describe("integration credential fields", () => {
  it("defines AWS fields with region default", () => {
    const fields = getCredentialFields("aws");
    expect(fields.map((f) => f.key)).toEqual([
      "access_key_id",
      "secret_access_key",
      "region",
    ]);
    expect(fields.find((f) => f.key === "region")?.defaultValue).toBe("us-east-1");
  });

  it("defines Okta fields matching the Python connector credential keys", () => {
    const fields = getCredentialFields("okta");
    expect(fields.map((f) => f.key)).toEqual(["domain", "api_token"]);
  });

  it("defines 1Password fields matching the Python connector credential keys", () => {
    const fields = getCredentialFields("1password");
    expect(fields.map((f) => f.key)).toEqual(["api_token"]);
  });

  it("defines Batch 1 non-OAuth fields matching Python connector keys", () => {
    expect(getCredentialFields("digitalocean").map((f) => f.key)).toEqual([
      "api_token",
    ]);
    expect(getCredentialFields("cloudflare").map((f) => f.key)).toEqual([
      "api_token",
      "account_id",
    ]);
    expect(getCredentialFields("datadog").map((f) => f.key)).toEqual([
      "api_key",
      "app_key",
      "site",
    ]);
    expect(getCredentialFields("twilio").map((f) => f.key)).toEqual([
      "account_sid",
      "auth_token",
    ]);
    expect(getCredentialFields("snyk").map((f) => f.key)).toEqual([
      "api_token",
      "org_id",
    ]);
    expect(getCredentialFields("jumpcloud").map((f) => f.key)).toEqual([
      "api_key",
    ]);
    expect(getCredentialFields("bamboohr").map((f) => f.key)).toEqual([
      "subdomain",
      "api_key",
    ]);
    expect(getCredentialFields("backblaze").map((f) => f.key)).toEqual([
      "key_id",
      "application_key",
    ]);
  });

  it("falls back to generic key/secret fields", () => {
    const fields = getCredentialFields("unknown-type");
    expect(fields.map((f) => f.key)).toEqual(["api_key", "api_secret"]);
  });

  it("defines demo AWS fields with prefill defaults", () => {
    const fields = getCredentialFields(DEMO_AWS_ID);
    expect(fields.map((f) => f.key)).toEqual([
      "access_key_id",
      "secret_access_key",
      "region",
    ]);
    expect(fields.find((f) => f.key === "access_key_id")?.defaultValue).toBe(
      "AKIAIOSFODNN7EXAMPLE"
    );
  });
});
