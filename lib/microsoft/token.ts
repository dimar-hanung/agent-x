import { refreshMicrosoftAccessToken } from "@/lib/microsoft/oauth";
import {
  getMicrosoftCredentials,
  updateMicrosoftTokens,
} from "@/lib/integrations/microsoft-repository";

const REFRESH_SKEW_MS = 60_000;

export async function getValidMicrosoftAccessToken(
  userId: string
): Promise<string | null> {
  const credentials = await getMicrosoftCredentials(userId);

  if (!credentials) {
    return null;
  }

  const expiresAt = credentials.tokenExpiresAt?.getTime() ?? 0;
  const stillValid = expiresAt > Date.now() + REFRESH_SKEW_MS;

  if (stillValid && credentials.accessToken) {
    return credentials.accessToken;
  }

  const refreshed = await refreshMicrosoftAccessToken(credentials.refreshToken);

  await updateMicrosoftTokens(userId, {
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
    tokenExpiresAt: refreshed.expiryDate
      ? new Date(refreshed.expiryDate)
      : null,
  });

  return refreshed.accessToken;
}
