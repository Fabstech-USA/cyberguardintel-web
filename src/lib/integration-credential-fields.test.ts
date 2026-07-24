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

  it("defines Batch 2 non-OAuth fields matching Python connector keys", () => {
    expect(getCredentialFields("gcp").map((f) => f.key)).toEqual([
      "service_account_json",
      "project_id",
    ]);
    expect(getCredentialFields("onelogin").map((f) => f.key)).toEqual([
      "client_id",
      "client_secret",
      "region",
    ]);
    expect(getCredentialFields("duo").map((f) => f.key)).toEqual([
      "integration_key",
      "secret_key",
      "api_hostname",
    ]);
    expect(getCredentialFields("crowdstrike").map((f) => f.key)).toEqual([
      "client_id",
      "client_secret",
      "base_url",
    ]);
    expect(getCredentialFields("tenable").map((f) => f.key)).toEqual([
      "access_key",
      "secret_key",
    ]);
    expect(getCredentialFields("bitwarden").map((f) => f.key)).toEqual([
      "client_id",
      "client_secret",
      "server_url",
    ]);
    expect(getCredentialFields("lastpass").map((f) => f.key)).toEqual([
      "cid",
      "provhash",
    ]);
    expect(getCredentialFields("deel").map((f) => f.key)).toEqual(["api_token"]);
    expect(getCredentialFields("doxy").map((f) => f.key)).toEqual([
      "api_key",
      "clinic_slug",
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
