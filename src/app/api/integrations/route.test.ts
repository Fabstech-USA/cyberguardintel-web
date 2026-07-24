import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEMO_AWS_ID,
  DEMO_GOOGLE_WORKSPACE_ID,
} from "@/lib/demo-integrations";
import {
  validateConnectIntegrationBody,
} from "@/lib/integration-route-validation";

describe("integrations route validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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
      type: "azure",
      credentials: { key: "value" },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("not connectable");
    }
  });

  it("accepts demo aws with iam credentials when demo is enabled", () => {
    vi.stubEnv("NODE_ENV", "development");
    const result = validateConnectIntegrationBody({
      type: DEMO_AWS_ID,
      credentials: {
        access_key_id: "AKIAIOSFODNN7EXAMPLE",
        secret_access_key: "secret",
        region: "us-east-1",
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts demo google workspace with empty credentials when demo is enabled", () => {
    vi.stubEnv("NODE_ENV", "development");
    const result = validateConnectIntegrationBody({
      type: DEMO_GOOGLE_WORKSPACE_ID,
      credentials: {},
    });
    expect(result.success).toBe(true);
  });

  it("rejects demo aws with empty credentials", () => {
    vi.stubEnv("NODE_ENV", "development");
    const result = validateConnectIntegrationBody({
      type: DEMO_AWS_ID,
      credentials: {},
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
