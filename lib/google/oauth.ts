import { google } from "googleapis";

export const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.file",
] as const;

export const GOOGLE_OAUTH_STATE_COOKIE = "agentx_google_oauth_state";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function getGoogleOAuthClient() {
  return new google.auth.OAuth2(
    requireEnv("GOOGLE_CLIENT_ID"),
    requireEnv("GOOGLE_CLIENT_SECRET"),
    requireEnv("GOOGLE_REDIRECT_URI")
  );
}

export function buildGoogleAuthUrl(state: string): string {
  const client = getGoogleOAuthClient();

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [...GOOGLE_OAUTH_SCOPES],
    state,
    include_granted_scopes: true,
  });
}

export async function exchangeGoogleAuthCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiryDate: number | null;
  scopes: string;
  email: string;
}> {
  const client = getGoogleOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token) {
    throw new Error("Google OAuth did not return an access token.");
  }

  if (!tokens.refresh_token) {
    throw new Error(
      "Google OAuth did not return a refresh token. Disconnect the app in Google Account permissions and try again."
    );
  }

  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const profile = await oauth2.userinfo.get();
  const email = profile.data.email?.trim().toLowerCase();

  if (!email) {
    throw new Error("Google OAuth did not return an email address.");
  }

  const scopes =
    typeof tokens.scope === "string" && tokens.scope.length > 0
      ? tokens.scope
      : GOOGLE_OAUTH_SCOPES.join(" ");

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date ?? null,
    scopes,
    email,
  };
}

export async function revokeGoogleToken(token: string): Promise<void> {
  const client = getGoogleOAuthClient();
  await client.revokeToken(token);
}
