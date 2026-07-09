import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { userIntegrations } from "@/lib/db/schema";

import { decryptSecret, encryptSecret } from "./crypto";

export const GOOGLE_PROVIDER = "google";

interface StoredGoogleCredentials {
  accessToken: string;
  refreshToken: string;
}

export interface GoogleIntegrationStatus {
  connected: boolean;
  email?: string;
  lastVerifiedAt?: string;
  scopes?: string;
  tokenExpiresAt?: string;
}

export interface GoogleCredentials {
  email: string;
  accessToken: string;
  refreshToken: string;
  scopes: string | null;
  tokenExpiresAt: Date | null;
}

export async function getGoogleIntegrationStatus(
  userId: string
): Promise<GoogleIntegrationStatus> {
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
        eq(userIntegrations.provider, GOOGLE_PROVIDER)
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

export async function getGoogleCredentials(
  userId: string
): Promise<GoogleCredentials | null> {
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
        eq(userIntegrations.provider, GOOGLE_PROVIDER)
      )
    )
    .limit(1);

  if (!row || row.status !== "connected") {
    return null;
  }

  const stored = JSON.parse(
    decryptSecret(row.credentialsEncrypted)
  ) as StoredGoogleCredentials;

  return {
    email: row.email,
    accessToken: stored.accessToken,
    refreshToken: stored.refreshToken,
    scopes: row.scopes,
    tokenExpiresAt: row.tokenExpiresAt,
  };
}

export async function upsertGoogleIntegration(
  userId: string,
  input: {
    email: string;
    accessToken: string;
    refreshToken: string;
    scopes: string;
    tokenExpiresAt: Date | null;
  }
): Promise<GoogleIntegrationStatus> {
  const email = input.email.trim().toLowerCase();
  const credentialsEncrypted = encryptSecret(
    JSON.stringify({
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
    } satisfies StoredGoogleCredentials)
  );
  const now = new Date();

  const [existing] = await db
    .select({ id: userIntegrations.id })
    .from(userIntegrations)
    .where(
      and(
        eq(userIntegrations.userId, userId),
        eq(userIntegrations.provider, GOOGLE_PROVIDER)
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
      provider: GOOGLE_PROVIDER,
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

export async function updateGoogleTokens(
  userId: string,
  input: {
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt: Date | null;
  }
): Promise<void> {
  const existing = await getGoogleCredentials(userId);

  if (!existing) {
    throw new Error("Google integration is not connected.");
  }

  const refreshToken = input.refreshToken ?? existing.refreshToken;
  const credentialsEncrypted = encryptSecret(
    JSON.stringify({
      accessToken: input.accessToken,
      refreshToken,
    } satisfies StoredGoogleCredentials)
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
        eq(userIntegrations.provider, GOOGLE_PROVIDER)
      )
    );
}

export async function deleteGoogleIntegration(userId: string): Promise<void> {
  await db
    .delete(userIntegrations)
    .where(
      and(
        eq(userIntegrations.userId, userId),
        eq(userIntegrations.provider, GOOGLE_PROVIDER)
      )
    );
}
