import { getGoogleOAuthClient } from "@/lib/google/oauth";
import {
  getGoogleCredentials,
  updateGoogleTokens,
} from "@/lib/integrations/google-repository";

const REFRESH_SKEW_MS = 60_000;

export async function getValidAccessToken(userId: string): Promise<string | null> {
  const credentials = await getGoogleCredentials(userId);

  if (!credentials) {
    return null;
  }

  const expiresAt = credentials.tokenExpiresAt?.getTime() ?? 0;
  const stillValid = expiresAt > Date.now() + REFRESH_SKEW_MS;

  if (stillValid && credentials.accessToken) {
    return credentials.accessToken;
  }

  const client = getGoogleOAuthClient();
  client.setCredentials({
    access_token: credentials.accessToken,
    refresh_token: credentials.refreshToken,
    expiry_date: expiresAt || undefined,
  });

  const { credentials: refreshed } = await client.refreshAccessToken();

  if (!refreshed.access_token) {
    throw new Error("Failed to refresh Google access token.");
  }

  await updateGoogleTokens(userId, {
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token ?? undefined,
    tokenExpiresAt: refreshed.expiry_date
      ? new Date(refreshed.expiry_date)
      : null,
  });

  return refreshed.access_token;
}
