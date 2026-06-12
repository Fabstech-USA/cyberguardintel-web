import { describe, expect, it } from "vitest";

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

  it("falls back to generic key/secret fields", () => {
    const fields = getCredentialFields("unknown-type");
    expect(fields.map((f) => f.key)).toEqual(["api_key", "api_secret"]);
  });
});
