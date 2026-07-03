import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { userIntegrations } from "@/lib/db/schema";

import { decryptSecret, encryptSecret } from "./crypto";

const GMAIL_PROVIDER = "gmail";

interface StoredGmailCredentials {
  appPassword: string;
}

export interface GmailIntegrationStatus {
  connected: boolean;
  email?: string;
  lastVerifiedAt?: string;
}

export interface GmailCredentials {
  email: string;
  appPassword: string;
}

export async function getGmailIntegrationStatus(
  userId: string
): Promise<GmailIntegrationStatus> {
  const [row] = await db
    .select({
      email: userIntegrations.email,
      status: userIntegrations.status,
      lastVerifiedAt: userIntegrations.lastVerifiedAt,
    })
    .from(userIntegrations)
    .where(
      and(
        eq(userIntegrations.userId, userId),
        eq(userIntegrations.provider, GMAIL_PROVIDER)
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
  };
}

export async function getGmailCredentials(
  userId: string
): Promise<GmailCredentials | null> {
  const [row] = await db
    .select({
      email: userIntegrations.email,
      credentialsEncrypted: userIntegrations.credentialsEncrypted,
      status: userIntegrations.status,
    })
    .from(userIntegrations)
    .where(
      and(
        eq(userIntegrations.userId, userId),
        eq(userIntegrations.provider, GMAIL_PROVIDER)
      )
    )
    .limit(1);

  if (!row || row.status !== "connected") {
    return null;
  }

  const stored = JSON.parse(
    decryptSecret(row.credentialsEncrypted)
  ) as StoredGmailCredentials;

  return {
    email: row.email,
    appPassword: stored.appPassword,
  };
}

export async function upsertGmailIntegration(
  userId: string,
  input: { email: string; appPassword: string }
): Promise<GmailIntegrationStatus> {
  const email = input.email.trim().toLowerCase();
  const credentialsEncrypted = encryptSecret(
    JSON.stringify({ appPassword: input.appPassword } satisfies StoredGmailCredentials)
  );
  const now = new Date();

  const [existing] = await db
    .select({ id: userIntegrations.id })
    .from(userIntegrations)
    .where(
      and(
        eq(userIntegrations.userId, userId),
        eq(userIntegrations.provider, GMAIL_PROVIDER)
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
        updatedAt: now,
      })
      .where(eq(userIntegrations.id, existing.id));
  } else {
    await db.insert(userIntegrations).values({
      userId,
      provider: GMAIL_PROVIDER,
      email,
      credentialsEncrypted,
      status: "connected",
      lastVerifiedAt: now,
    });
  }

  return {
    connected: true,
    email,
    lastVerifiedAt: now.toISOString(),
  };
}

export async function deleteGmailIntegration(userId: string): Promise<void> {
  await db
    .delete(userIntegrations)
    .where(
      and(
        eq(userIntegrations.userId, userId),
        eq(userIntegrations.provider, GMAIL_PROVIDER)
      )
    );
}
