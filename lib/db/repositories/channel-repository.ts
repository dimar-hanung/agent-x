import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { chats } from "@/lib/db/schema";

export const MAIN_CHANNEL_TITLE = "Kanal utama";

export interface MainChannelSummary {
  id: string;
  title: string;
  updatedAt: Date;
}

export async function getOrCreateMainChannel(userId: string): Promise<string> {
  const existing = await getMainChannelId(userId);

  if (existing) {
    return existing;
  }

  const [chat] = await db
    .insert(chats)
    .values({
      userId,
      kind: "channel",
      title: MAIN_CHANNEL_TITLE,
    })
    .returning({ id: chats.id });

  return chat.id;
}

export async function getMainChannelId(userId: string): Promise<string | null> {
  const [chat] = await db
    .select({ id: chats.id })
    .from(chats)
    .where(and(eq(chats.userId, userId), eq(chats.kind, "channel")))
    .limit(1);

  return chat?.id ?? null;
}

export async function getMainChannelSummary(
  userId: string
): Promise<MainChannelSummary | null> {
  const [chat] = await db
    .select({
      id: chats.id,
      title: chats.title,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .where(and(eq(chats.userId, userId), eq(chats.kind, "channel")))
    .limit(1);

  return chat ?? null;
}

export async function isMainChannel(chatId: string): Promise<boolean> {
  const [chat] = await db
    .select({ kind: chats.kind })
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1);

  return chat?.kind === "channel";
}

export async function ensureMainChannelForUser(userId: string): Promise<void> {
  await getOrCreateMainChannel(userId);
}
