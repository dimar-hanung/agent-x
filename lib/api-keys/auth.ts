import { verifyApiKey } from "./repository";

export interface ApiKeyAuthResult {
  userId: string;
  keyId: string;
}

/**
 * Verifies a Bearer API key token for MCP / external clients.
 * Returns null when the token is missing or invalid.
 */
export async function authenticateApiKey(
  token: string | undefined
): Promise<ApiKeyAuthResult | null> {
  if (!token) {
    return null;
  }

  return verifyApiKey(token);
}
