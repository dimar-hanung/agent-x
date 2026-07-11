import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";

import type { ApiKeyListItem } from "./schemas";

const API_KEY_PREFIX = "ax_";
const TOKEN_PREFIX_DISPLAY_LENGTH = 11; // "ax_" + 8 hex chars

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateApiKeyToken(): string {
  return `${API_KEY_PREFIX}${randomBytes(32).toString("hex")}`;
}

function toListItem(row: {
  id: string;
  name: string;
  tokenPrefix: string;
  lastUsedAt: Date | null;
  createdAt: Date;
}): ApiKeyListItem {
  return {
    id: row.id,
    name: row.name,
    tokenPrefix: row.tokenPrefix,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

const apiKeySelect = {
  id: apiKeys.id,
  name: apiKeys.name,
  tokenPrefix: apiKeys.tokenPrefix,
  lastUsedAt: apiKeys.lastUsedAt,
  createdAt: apiKeys.createdAt,
} as const;

export async function listApiKeys(userId: string): Promise<ApiKeyListItem[]> {
  const rows = await db
    .select(apiKeySelect)
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .orderBy(desc(apiKeys.createdAt));

  return rows.map(toListItem);
}

export async function createApiKey(
  userId: string,
  name: string
): Promise<{ key: string; record: ApiKeyListItem }> {
  const key = generateApiKeyToken();
  const tokenHash = hashToken(key);
  const tokenPrefix = key.slice(0, TOKEN_PREFIX_DISPLAY_LENGTH);

  const [row] = await db
    .insert(apiKeys)
    .values({
      userId,
      name,
      tokenPrefix,
      tokenHash,
    })
    .returning(apiKeySelect);

  return { key, record: toListItem(row) };
}

export async function revokeApiKey(
  userId: string,
  keyId: string
): Promise<boolean> {
  const deleted = await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, userId)))
    .returning({ id: apiKeys.id });

  return deleted.length > 0;
}

export async function verifyApiKey(
  token: string
): Promise<{ userId: string; keyId: string } | null> {
  if (!token.startsWith(API_KEY_PREFIX) || token.length < 16) {
    return null;
  }

  const tokenHash = hashToken(token);
  const [row] = await db
    .select({
      id: apiKeys.id,
      userId: apiKeys.userId,
    })
    .from(apiKeys)
    .where(eq(apiKeys.tokenHash, tokenHash))
    .limit(1);

  if (!row) {
    return null;
  }

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id));

  return { userId: row.userId, keyId: row.id };
}
