import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildOAuthAuthorizationUrl,
  getOAuthProvider,
  getOAuthRedirectUri,
  OAUTH_PROVIDERS,
} from "@/lib/integrations/oauth-providers";

const OAUTH_TYPES = [
  "google-workspace",
  "microsoft-365",
  "github",
  "slack",
  "zoom",
  "dropbox",
  "box",
];

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("oauth providers", () => {
  it("registers all MVP OAuth integration types", () => {
    for (const type of OAUTH_TYPES) {
      expect(getOAuthProvider(type), type).toBeDefined();
      expect(OAUTH_PROVIDERS[type].type).toBe(type);
    }
  });

  it("returns undefined for unknown and non-OAuth types", () => {
    expect(getOAuthProvider("aws")).toBeUndefined();
    expect(getOAuthProvider("okta")).toBeUndefined();
    expect(getOAuthProvider("1password")).toBeUndefined();
    expect(getOAuthProvider("nonsense")).toBeUndefined();
  });

  it("builds an authorization URL with state and scopes", () => {
    vi.stubEnv("SLACK_CLIENT_ID", "slack-client");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");

    const provider = getOAuthProvider("slack")!;
    const url = new URL(buildOAuthAuthorizationUrl(provider, "state-123"));

    expect(url.origin + url.pathname).toBe("https://slack.com/oauth/v2/authorize");
    expect(url.searchParams.get("client_id")).toBe("slack-client");
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("scope")).toContain("users:read");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://app.example.com/api/integrations/slack/callback"
    );
  });

  it("includes provider-specific extra auth params", () => {
    vi.stubEnv("DROPBOX_CLIENT_ID", "dropbox-client");

    const provider = getOAuthProvider("dropbox")!;
    const url = new URL(buildOAuthAuthorizationUrl(provider, "s"));
    expect(url.searchParams.get("token_access_type")).toBe("offline");
  });

  it("throws when client id env is missing", () => {
    const provider = getOAuthProvider("zoom")!;
    expect(() => buildOAuthAuthorizationUrl(provider, "s")).toThrow(
      "ZOOM_CLIENT_ID is not configured"
    );
  });

  it("honors redirect URI env overrides", () => {
    vi.stubEnv("GITHUB_REDIRECT_URI", "https://custom.example.com/cb");
    const provider = getOAuthProvider("github")!;
    expect(getOAuthRedirectUri(provider)).toBe("https://custom.example.com/cb");
  });
});
