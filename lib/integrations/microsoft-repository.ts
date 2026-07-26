import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { userIntegrations } from "@/lib/db/schema";

import { decryptSecret, encryptSecret } from "./crypto";

export const MICROSOFT_PROVIDER = "microsoft";

interface StoredMicrosoftCredentials {
  accessToken: string;
  refreshToken: string;
}

export interface MicrosoftIntegrationStatus {
  connected: boolean;
  email?: string;
  lastVerifiedAt?: string;
  scopes?: string;
  tokenExpiresAt?: string;
}

export interface MicrosoftCredentials {
  email: string;
  accessToken: string;
  refreshToken: string;
  scopes: string | null;
  tokenExpiresAt: Date | null;
}

export async function getMicrosoftIntegrationStatus(
  userId: string
): Promise<MicrosoftIntegrationStatus> {
  const [row] = await db
    .select({
      email: userIntegrations.email,
      status: userIntegrations.status,
      lastVerifiedAt: userIntegrations.lastVerifiedAt,
      scopes: userIntegrations.scopes,
      tokenExpiresAt: userIntegrations.tokenExpiresAt,
    })
    .from(userIntegrations)
    .where(
      and(
        eq(userIntegrations.userId, userId),
        eq(userIntegrations.provider, MICROSOFT_PROVIDER)
      )
    )
    .limit(1);

  if (!row || row.status !== "connected") {
    return { connected: false };
  }

  return {
    connected: true,
    email: row.email,
    lastVerifiedAt: row.lastVerifiedAt?.toISOString(),
    scopes: row.scopes ?? undefined,
    tokenExpiresAt: row.tokenExpiresAt?.toISOString(),
  };
}

export async function getMicrosoftCredentials(
  userId: string
): Promise<MicrosoftCredentials | null> {
  const [row] = await db
    .select({
      email: userIntegrations.email,
      credentialsEncrypted: userIntegrations.credentialsEncrypted,
      status: userIntegrations.status,
      scopes: userIntegrations.scopes,
      tokenExpiresAt: userIntegrations.tokenExpiresAt,
    })
    .from(userIntegrations)
    .where(
      and(
        eq(userIntegrations.userId, userId),
        eq(userIntegrations.provider, MICROSOFT_PROVIDER)
      )
    )
    .limit(1);

  if (!row || row.status !== "connected") {
    return null;
  }

  const stored = JSON.parse(
    decryptSecret(row.credentialsEncrypted)
  ) as StoredMicrosoftCredentials;

  return {
    email: row.email,
    accessToken: stored.accessToken,
    refreshToken: stored.refreshToken,
    scopes: row.scopes,
    tokenExpiresAt: row.tokenExpiresAt,
  };
}

export async function upsertMicrosoftIntegration(
  userId: string,
  input: {
    email: string;
    accessToken: string;
    refreshToken: string;
    scopes: string;
    tokenExpiresAt: Date | null;
  }
): Promise<MicrosoftIntegrationStatus> {
  const email = input.email.trim().toLowerCase();
  const credentialsEncrypted = encryptSecret(
    JSON.stringify({
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
    } satisfies StoredMicrosoftCredentials)
  );
  const now = new Date();

  const [existing] = await db
    .select({ id: userIntegrations.id })
    .from(userIntegrations)
    .where(
      and(
        eq(userIntegrations.userId, userId),
        eq(userIntegrations.provider, MICROSOFT_PROVIDER)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(userIntegrations)
      .set({
        email,
        credentialsEncrypted,
        status: "connected",
        lastVerifiedAt: now,
        scopes: input.scopes,
        tokenExpiresAt: input.tokenExpiresAt,
        updatedAt: now,
      })
      .where(eq(userIntegrations.id, existing.id));
  } else {
    await db.insert(userIntegrations).values({
      userId,
      provider: MICROSOFT_PROVIDER,
      email,
      credentialsEncrypted,
      status: "connected",
      lastVerifiedAt: now,
      scopes: input.scopes,
      tokenExpiresAt: input.tokenExpiresAt,
    });
  }

  return {
    connected: true,
    email,
    lastVerifiedAt: now.toISOString(),
    scopes: input.scopes,
    tokenExpiresAt: input.tokenExpiresAt?.toISOString(),
  };
}

export async function updateMicrosoftTokens(
  userId: string,
  input: {
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt: Date | null;
  }
): Promise<void> {
  const existing = await getMicrosoftCredentials(userId);

  if (!existing) {
    throw new Error("Microsoft integration is not connected.");
  }

  const refreshToken = input.refreshToken ?? existing.refreshToken;
  const credentialsEncrypted = encryptSecret(
    JSON.stringify({
      accessToken: input.accessToken,
      refreshToken,
    } satisfies StoredMicrosoftCredentials)
  );
  const now = new Date();

  await db
    .update(userIntegrations)
    .set({
      credentialsEncrypted,
      tokenExpiresAt: input.tokenExpiresAt,
      lastVerifiedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(userIntegrations.userId, userId),
        eq(userIntegrations.provider, MICROSOFT_PROVIDER)
      )
    );
}

export async function deleteMicrosoftIntegration(userId: string): Promise<void> {
  await db
    .delete(userIntegrations)
    .where(
      and(
        eq(userIntegrations.userId, userId),
        eq(userIntegrations.provider, MICROSOFT_PROVIDER)
      )
    );
}
