import { describe, expect, it } from "vitest";

import {
  validateConnectIntegrationBody,
} from "@/lib/integration-route-validation";

describe("integrations route validation", () => {
  it("accepts aws api-key connect payload", () => {
    const result = validateConnectIntegrationBody({
      type: "aws",
      credentials: {
        access_key_id: "AKIA",
        secret_access_key: "secret",
        region: "us-east-1",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects oauth-only integrations via api post", () => {
    const result = validateConnectIntegrationBody({
      type: "google-workspace",
      credentials: { access_token: "token" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("OAuth");
    }
  });

  it("rejects unknown integration types", () => {
    const result = validateConnectIntegrationBody({
      type: "not-real",
      credentials: { key: "value" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-connectable integrations", () => {
    const result = validateConnectIntegrationBody({
      type: "slack",
      credentials: { token: "x" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty credentials", () => {
    const result = validateConnectIntegrationBody({
      type: "aws",
      credentials: {},
    });
    expect(result.success).toBe(false);
  });
});
