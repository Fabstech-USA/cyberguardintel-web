import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildGoogleWorkspaceAuthUrl,
  createOAuthState,
  exchangeGoogleWorkspaceCode,
  GOOGLE_WORKSPACE_SCOPES,
  parseOAuthState,
  serializeTokenPayloadForStorage,
} from "@/lib/integrations/google-workspace";

const TEST_SECRET = "a".repeat(64);

describe("google-workspace integration helpers", () => {
  beforeEach(() => {
    process.env.OAUTH_STATE_SECRET = TEST_SECRET;
    process.env.GOOGLE_WORKSPACE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_WORKSPACE_CLIENT_SECRET = "test-client-secret";
    process.env.GOOGLE_WORKSPACE_REDIRECT_URI =
      "http://localhost:3000/api/integrations/google-workspace/callback";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("buildGoogleWorkspaceAuthUrl includes client, scopes, redirect, and state", () => {
    const url = new URL(buildGoogleWorkspaceAuthUrl("signed-state"));
    expect(url.hostname).toBe("accounts.google.com");
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/integrations/google-workspace/callback"
    );
    expect(url.searchParams.get("state")).toBe("signed-state");
    expect(url.searchParams.get("access_type")).toBe("offline");
    expect(url.searchParams.get("prompt")).toBe("consent");
    for (const scope of GOOGLE_WORKSPACE_SCOPES) {
      expect(url.searchParams.get("scope")).toContain(scope);
    }
  });

  it("createOAuthState and parseOAuthState round-trip organization binding", () => {
    const state = createOAuthState("org-123");
    const parsed = parseOAuthState(state);
    expect(parsed).toEqual(
      expect.objectContaining({
        organizationId: "org-123",
        nonce: expect.any(String),
      })
    );
  });

  it("parseOAuthState rejects tampered signatures", () => {
    const state = createOAuthState("org-123");
    const tampered = `${state}x`;
    expect(parseOAuthState(tampered)).toBeNull();
  });

  it("exchangeGoogleWorkspaceCode returns token payload from Google", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "access-123",
          refresh_token: "refresh-123",
          expires_in: 3600,
          scope: GOOGLE_WORKSPACE_SCOPES.join(" "),
          token_type: "Bearer",
        }),
        { status: 200 }
      )
    );

    const payload = await exchangeGoogleWorkspaceCode("auth-code");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({ method: "POST" })
    );
    expect(payload.access_token).toBe("access-123");
    expect(payload.refresh_token).toBe("refresh-123");
    expect(payload.client_id).toBe("test-client-id");
    expect(payload.scopes).toEqual([...GOOGLE_WORKSPACE_SCOPES]);
    expect(payload.expiry).toBeDefined();
  });

  it("serializeTokenPayloadForStorage returns JSON string", () => {
    const json = serializeTokenPayloadForStorage({
      access_token: "access-123",
      token_uri: "https://oauth2.googleapis.com/token",
      client_id: "test-client-id",
      client_secret: "test-client-secret",
      scopes: [...GOOGLE_WORKSPACE_SCOPES],
    });
    expect(JSON.parse(json)).toMatchObject({
      access_token: "access-123",
      client_id: "test-client-id",
    });
  });
});
