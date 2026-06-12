import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const GOOGLE_WORKSPACE_INTEGRATION_TYPE = "google-workspace";

export const GOOGLE_WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/admin.directory.user.readonly",
  "https://www.googleapis.com/auth/admin.directory.rolemanagement.readonly",
  "https://www.googleapis.com/auth/admin.directory.domain.readonly",
] as const;

export const GWS_OAUTH_STATE_COOKIE = "gws_oauth_state";

export type GoogleWorkspaceTokenPayload = {
  access_token: string;
  refresh_token?: string;
  token_uri: string;
  client_id: string;
  client_secret: string;
  scopes: string[];
  expiry?: string;
  token_type?: string;
};

export type GoogleWorkspaceOAuthState = {
  organizationId: string;
  nonce: string;
};

function oauthStateSecret(): string {
  return process.env.OAUTH_STATE_SECRET ?? process.env.ENCRYPTION_KEY ?? "";
}

function signPayload(payload: string): string {
  const secret = oauthStateSecret();
  if (!secret) {
    throw new Error("OAUTH_STATE_SECRET or ENCRYPTION_KEY must be configured");
  }
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createOAuthState(organizationId: string): string {
  const nonce = randomBytes(16).toString("hex");
  const payload = Buffer.from(
    JSON.stringify({ organizationId, nonce }),
    "utf8"
  ).toString("base64url");
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

export function parseOAuthState(state: string): GoogleWorkspaceOAuthState | null {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = signPayload(payload);
  const sigBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as GoogleWorkspaceOAuthState;
    if (!parsed.organizationId || !parsed.nonce) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getGoogleWorkspaceClientId(): string {
  const clientId = process.env.GOOGLE_WORKSPACE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_WORKSPACE_CLIENT_ID is not configured");
  }
  return clientId;
}

export function getGoogleWorkspaceClientSecret(): string {
  const clientSecret = process.env.GOOGLE_WORKSPACE_CLIENT_SECRET;
  if (!clientSecret) {
    throw new Error("GOOGLE_WORKSPACE_CLIENT_SECRET is not configured");
  }
  return clientSecret;
}

export function getGoogleWorkspaceRedirectUri(): string {
  return (
    process.env.GOOGLE_WORKSPACE_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/integrations/google-workspace/callback`
  );
}

export function buildGoogleWorkspaceAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getGoogleWorkspaceClientId(),
    redirect_uri: getGoogleWorkspaceRedirectUri(),
    response_type: "code",
    scope: GOOGLE_WORKSPACE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleWorkspaceCode(
  code: string
): Promise<GoogleWorkspaceTokenPayload> {
  const body = new URLSearchParams({
    code,
    client_id: getGoogleWorkspaceClientId(),
    client_secret: getGoogleWorkspaceClientSecret(),
    redirect_uri: getGoogleWorkspaceRedirectUri(),
    grant_type: "authorization_code",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
  };

  const expiry =
    data.expires_in != null
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined;

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_uri: "https://oauth2.googleapis.com/token",
    client_id: getGoogleWorkspaceClientId(),
    client_secret: getGoogleWorkspaceClientSecret(),
    scopes: data.scope?.split(" ") ?? [...GOOGLE_WORKSPACE_SCOPES],
    expiry,
    token_type: data.token_type,
  };
}

export function serializeTokenPayloadForStorage(
  payload: GoogleWorkspaceTokenPayload
): string {
  return JSON.stringify(payload);
}
