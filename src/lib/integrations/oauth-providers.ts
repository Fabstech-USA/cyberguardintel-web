/**
 * Generic OAuth 2.0 provider configuration for integration connect flows.
 * Each provider maps an Integration.type to its authorization/token endpoints
 * and the credential payload stored (encrypted) for the Python connectors.
 */

export const OAUTH_STATE_COOKIE = "integration_oauth_state";

export type OAuthTokenPayload = {
  access_token: string;
  refresh_token?: string;
  token_uri: string;
  client_id: string;
  client_secret: string;
  scopes: string[];
  expiry?: string;
  token_type?: string;
  [key: string]: unknown;
};

export type OAuthProviderConfig = {
  type: string;
  displayName: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  /** Extra query params appended to the authorization URL. */
  extraAuthParams?: Record<string, string>;
  /** "basic" sends client credentials via Authorization header (Zoom). */
  tokenAuthMethod?: "body" | "basic";
  /** Slack-style: scopes that apply to the installing user token. */
  scopeParamName?: string;
  /** Optional post-exchange enrichment (e.g. resolve GitHub org). */
  enrichCredentials?: (payload: OAuthTokenPayload) => Promise<OAuthTokenPayload>;
};

async function enrichGitHubCredentials(
  payload: OAuthTokenPayload
): Promise<OAuthTokenPayload> {
  const response = await fetch("https://api.github.com/user/orgs", {
    headers: {
      Authorization: `Bearer ${payload.access_token}`,
      Accept: "application/vnd.github+json",
    },
  });
  if (!response.ok) {
    return payload;
  }
  const orgs = (await response.json()) as { login?: string }[];
  const org = orgs[0]?.login;
  return org ? { ...payload, org } : payload;
}

export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  "google-workspace": {
    type: "google-workspace",
    displayName: "Google Workspace",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/admin.directory.user.readonly",
      "https://www.googleapis.com/auth/admin.directory.rolemanagement.readonly",
      "https://www.googleapis.com/auth/admin.directory.domain.readonly",
    ],
    clientIdEnv: "GOOGLE_WORKSPACE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_WORKSPACE_CLIENT_SECRET",
    extraAuthParams: {
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
    },
  },
  "microsoft-365": {
    type: "microsoft-365",
    displayName: "Microsoft 365",
    authorizationUrl:
      "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: [
      "offline_access",
      "https://graph.microsoft.com/User.Read.All",
      "https://graph.microsoft.com/Directory.Read.All",
      "https://graph.microsoft.com/Policy.Read.All",
      "https://graph.microsoft.com/Reports.Read.All",
    ],
    clientIdEnv: "MICROSOFT_365_CLIENT_ID",
    clientSecretEnv: "MICROSOFT_365_CLIENT_SECRET",
    extraAuthParams: { response_mode: "query" },
  },
  github: {
    type: "github",
    displayName: "GitHub",
    authorizationUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["read:org", "repo"],
    clientIdEnv: "GITHUB_CLIENT_ID",
    clientSecretEnv: "GITHUB_CLIENT_SECRET",
    enrichCredentials: enrichGitHubCredentials,
  },
  slack: {
    type: "slack",
    displayName: "Slack",
    authorizationUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopes: ["team:read", "users:read", "users:read.email"],
    clientIdEnv: "SLACK_CLIENT_ID",
    clientSecretEnv: "SLACK_CLIENT_SECRET",
  },
  zoom: {
    type: "zoom",
    displayName: "Zoom",
    authorizationUrl: "https://zoom.us/oauth/authorize",
    tokenUrl: "https://zoom.us/oauth/token",
    scopes: [],
    clientIdEnv: "ZOOM_CLIENT_ID",
    clientSecretEnv: "ZOOM_CLIENT_SECRET",
    tokenAuthMethod: "basic",
  },
  dropbox: {
    type: "dropbox",
    displayName: "Dropbox Business",
    authorizationUrl: "https://www.dropbox.com/oauth2/authorize",
    tokenUrl: "https://api.dropboxapi.com/oauth2/token",
    scopes: [
      "team_info.read",
      "members.read",
      "team_data.governance.read",
    ],
    clientIdEnv: "DROPBOX_CLIENT_ID",
    clientSecretEnv: "DROPBOX_CLIENT_SECRET",
    extraAuthParams: { token_access_type: "offline" },
  },
  box: {
    type: "box",
    displayName: "Box",
    authorizationUrl: "https://account.box.com/api/oauth2/authorize",
    tokenUrl: "https://api.box.com/oauth2/token",
    scopes: [],
    clientIdEnv: "BOX_CLIENT_ID",
    clientSecretEnv: "BOX_CLIENT_SECRET",
  },
};

export function getOAuthProvider(type: string): OAuthProviderConfig | undefined {
  return OAUTH_PROVIDERS[type];
}

export function getOAuthClientId(provider: OAuthProviderConfig): string {
  const clientId = process.env[provider.clientIdEnv];
  if (!clientId) {
    throw new Error(`${provider.clientIdEnv} is not configured`);
  }
  return clientId;
}

export function getOAuthClientSecret(provider: OAuthProviderConfig): string {
  const clientSecret = process.env[provider.clientSecretEnv];
  if (!clientSecret) {
    throw new Error(`${provider.clientSecretEnv} is not configured`);
  }
  return clientSecret;
}

export function getOAuthRedirectUri(provider: OAuthProviderConfig): string {
  const envOverride =
    process.env[`${provider.clientIdEnv.replace(/_CLIENT_ID$/, "")}_REDIRECT_URI`];
  if (envOverride) {
    return envOverride;
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/integrations/${provider.type}/callback`;
}

export function buildOAuthAuthorizationUrl(
  provider: OAuthProviderConfig,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: getOAuthClientId(provider),
    redirect_uri: getOAuthRedirectUri(provider),
    response_type: "code",
    state,
    ...provider.extraAuthParams,
  });
  if (provider.scopes.length > 0) {
    params.set(provider.scopeParamName ?? "scope", provider.scopes.join(" "));
  }
  return `${provider.authorizationUrl}?${params.toString()}`;
}

export async function exchangeOAuthCode(
  provider: OAuthProviderConfig,
  code: string
): Promise<OAuthTokenPayload> {
  const clientId = getOAuthClientId(provider);
  const clientSecret = getOAuthClientSecret(provider);

  const body = new URLSearchParams({
    code,
    redirect_uri: getOAuthRedirectUri(provider),
    grant_type: "authorization_code",
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  if (provider.tokenAuthMethod === "basic") {
    headers.Authorization = `Basic ${Buffer.from(
      `${clientId}:${clientSecret}`
    ).toString("base64")}`;
  } else {
    body.set("client_id", clientId);
    body.set("client_secret", clientSecret);
  }

  const response = await fetch(provider.tokenUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(
      `${provider.displayName} token exchange failed with status ${response.status}`
    );
  }

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
    error?: string;
    // Slack nests the user token under authed_user for user-scoped installs
    authed_user?: { access_token?: string; scope?: string };
  };

  const accessToken = data.access_token ?? data.authed_user?.access_token;
  if (!accessToken || data.error) {
    throw new Error(
      `${provider.displayName} token exchange failed: ${data.error ?? "no access token"}`
    );
  }

  const expiry =
    data.expires_in != null
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined;

  let payload: OAuthTokenPayload = {
    access_token: accessToken,
    refresh_token: data.refresh_token,
    token_uri: provider.tokenUrl,
    client_id: clientId,
    client_secret: clientSecret,
    scopes: data.scope?.split(/[ ,]+/).filter(Boolean) ?? [...provider.scopes],
    expiry,
    token_type: data.token_type,
  };

  if (provider.enrichCredentials) {
    payload = await provider.enrichCredentials(payload);
  }

  return payload;
}

export function serializeOAuthPayloadForStorage(
  payload: OAuthTokenPayload
): string {
  return JSON.stringify(payload);
}
