const MICROSOFT_AUTHORITY = "https://login.microsoftonline.com/common/oauth2/v2.0";
const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

export const MICROSOFT_OAUTH_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "User.Read",
  "Mail.ReadWrite",
  "Calendars.ReadWrite",
  "Files.ReadWrite",
] as const;

export const MICROSOFT_OAUTH_STATE_COOKIE = "agentx_microsoft_oauth_state";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function getClientId(): string {
  return requireEnv("MICROSOFT_CLIENT_ID");
}

function getClientSecret(): string {
  return requireEnv("MICROSOFT_CLIENT_SECRET");
}

function getRedirectUri(): string {
  return requireEnv("MICROSOFT_REDIRECT_URI");
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
}

interface GraphMeResponse {
  mail?: string | null;
  userPrincipalName?: string | null;
}

async function postToken(body: URLSearchParams): Promise<TokenResponse> {
  const response = await fetch(`${MICROSOFT_AUTHORITY}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = (await response.json()) as TokenResponse;

  if (!response.ok) {
    throw new Error(
      data.error_description ?? data.error ?? "Microsoft token request failed."
    );
  }

  return data;
}

async function fetchUserEmail(accessToken: string): Promise<string> {
  const response = await fetch(`${GRAPH_BASE_URL}/me?$select=mail,userPrincipalName`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Microsoft OAuth did not return a user profile.");
  }

  const profile = (await response.json()) as GraphMeResponse;
  const email =
    profile.mail?.trim().toLowerCase() ??
    profile.userPrincipalName?.trim().toLowerCase();

  if (!email) {
    throw new Error("Microsoft OAuth did not return an email address.");
  }

  return email;
}

export function buildMicrosoftAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    response_type: "code",
    redirect_uri: getRedirectUri(),
    response_mode: "query",
    scope: MICROSOFT_OAUTH_SCOPES.join(" "),
    state,
    prompt: "consent",
  });

  return `${MICROSOFT_AUTHORITY}/authorize?${params.toString()}`;
}

export async function exchangeMicrosoftAuthCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiryDate: number | null;
  scopes: string;
  email: string;
}> {
  const body = new URLSearchParams({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    code,
    redirect_uri: getRedirectUri(),
    grant_type: "authorization_code",
    scope: MICROSOFT_OAUTH_SCOPES.join(" "),
  });

  const tokens = await postToken(body);

  if (!tokens.access_token) {
    throw new Error("Microsoft OAuth did not return an access token.");
  }

  if (!tokens.refresh_token) {
    throw new Error(
      "Microsoft OAuth did not return a refresh token. Disconnect the app in Microsoft account permissions and try again."
    );
  }

  const scopes =
    typeof tokens.scope === "string" && tokens.scope.length > 0
      ? tokens.scope
      : MICROSOFT_OAUTH_SCOPES.join(" ");

  const email = await fetchUserEmail(tokens.access_token);

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expires_in
      ? Date.now() + tokens.expires_in * 1000
      : null,
    scopes,
    email,
  };
}

export async function refreshMicrosoftAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiryDate: number | null;
}> {
  const body = new URLSearchParams({
    client_id: getClientId(),
    client_secret: getClientSecret(),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: MICROSOFT_OAUTH_SCOPES.join(" "),
  });

  const tokens = await postToken(body);

  if (!tokens.access_token) {
    throw new Error("Failed to refresh Microsoft access token.");
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expires_in
      ? Date.now() + tokens.expires_in * 1000
      : null,
  };
}
