import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEMO_AWS_ID,
  DEMO_GOOGLE_WORKSPACE_ID,
  getDemoIntegrationConfig,
  isDemoIntegrationsEnabled,
} from "@/lib/demo-integrations";
import {
  getCatalogEntry,
  getVisibleIntegrationCatalog,
  INTEGRATION_CATALOG,
} from "@/lib/integration-catalog";

describe("demo integrations", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is enabled in development by default", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_DEMO_INTEGRATIONS_ENABLED", "");
    expect(isDemoIntegrationsEnabled()).toBe(true);
  });

  it("is disabled in production unless explicitly enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_DEMO_INTEGRATIONS_ENABLED", "");
    expect(isDemoIntegrationsEnabled()).toBe(false);
  });

  it("can be forced on in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_DEMO_INTEGRATIONS_ENABLED", "true");
    expect(isDemoIntegrationsEnabled()).toBe(true);
  });

  it("replaces aws and google-workspace with demo stubs when enabled", () => {
    vi.stubEnv("NODE_ENV", "development");
    const catalog = getVisibleIntegrationCatalog();
    expect(catalog).toHaveLength(INTEGRATION_CATALOG.length);
    expect(catalog.some((entry) => entry.id === "aws")).toBe(false);
    expect(catalog.some((entry) => entry.id === "google-workspace")).toBe(false);
    expect(catalog.some((entry) => entry.id === DEMO_AWS_ID)).toBe(true);
    expect(catalog.some((entry) => entry.id === DEMO_GOOGLE_WORKSPACE_ID)).toBe(
      true
    );
  });

  it("resolves demo catalog entries with real branding", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(getCatalogEntry(DEMO_AWS_ID)?.name).toBe("AWS");
    expect(getCatalogEntry(DEMO_AWS_ID)?.iconId).toBe("aws");
    expect(getCatalogEntry(DEMO_GOOGLE_WORKSPACE_ID)?.name).toBe(
      "Google Workspace"
    );
  });

  it("returns fixture profile config per demo type", () => {
    expect(getDemoIntegrationConfig(DEMO_AWS_ID)).toEqual({
      fixture: true,
      profile: "aws",
    });
    expect(getDemoIntegrationConfig(DEMO_GOOGLE_WORKSPACE_ID)).toEqual({
      fixture: true,
      profile: "google-workspace",
    });
  });
});
