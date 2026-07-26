import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  whatsappChats,
  whatsappMessages,
  type WhatsAppChatType,
  type WhatsAppMessageDirection,
} from "@/lib/db/schema";
import type { WhatsAppIngestMessage } from "@/lib/integrations/whatsapp/types";

export interface IngestMessageInput {
  userId: string;
  message: WhatsAppIngestMessage;
}

function resolveDisplayName(message: WhatsAppIngestMessage): string {
  if (message.isGroup) {
    return message.remoteJid.replace(/@.*$/, "");
  }

  return message.senderName ?? message.senderPhoneE164 ?? message.remoteJid;
}

async function upsertChat(
  userId: string,
  message: WhatsAppIngestMessage
): Promise<string> {
  const sentAt = message.sentAt ?? new Date();
  const chatType: WhatsAppChatType = message.isGroup ? "group" : "dm";
  const displayName = resolveDisplayName(message);

  const [existing] = await db
    .select({ id: whatsappChats.id })
    .from(whatsappChats)
    .where(
      and(
        eq(whatsappChats.userId, userId),
        eq(whatsappChats.remoteJid, message.remoteJid)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(whatsappChats)
      .set({
        displayName,
        chatType,
        lastMessageAt: sentAt,
        updatedAt: new Date(),
      })
      .where(eq(whatsappChats.id, existing.id));

    return existing.id;
  }

  const [created] = await db
    .insert(whatsappChats)
    .values({
      userId,
      remoteJid: message.remoteJid,
      chatType,
      displayName,
      lastMessageAt: sentAt,
    })
    .returning({ id: whatsappChats.id });

  return created.id;
}

export async function ingestWhatsAppMessage(
  input: IngestMessageInput
): Promise<boolean> {
  const { userId, message } = input;

  if (!message.messageId) {
    return false;
  }

  const [existing] = await db
    .select({ id: whatsappMessages.id })
    .from(whatsappMessages)
    .where(
      and(
        eq(whatsappMessages.userId, userId),
        eq(whatsappMessages.waMessageId, message.messageId)
      )
    )
    .limit(1);

  if (existing) {
    return false;
  }

  const chatId = await upsertChat(userId, message);
  const direction: WhatsAppMessageDirection = message.direction;
  const sentAt = message.sentAt ?? new Date();

  await db.insert(whatsappMessages).values({
    userId,
    chatId,
    waMessageId: message.messageId,
    senderJid: message.senderJid,
    senderName: message.senderName,
    direction,
    text: message.text,
    sentAt,
  });

  return true;
}

export async function listUserWhatsAppChats(userId: string) {
  return db
    .select()
    .from(whatsappChats)
    .where(eq(whatsappChats.userId, userId))
    .orderBy(desc(whatsappChats.lastMessageAt));
}

export async function getWhatsAppChatForUser(
  userId: string,
  chatId: string
) {
  const [chat] = await db
    .select()
    .from(whatsappChats)
    .where(and(eq(whatsappChats.userId, userId), eq(whatsappChats.id, chatId)))
    .limit(1);

  return chat ?? null;
}

export async function findWhatsAppChatByQuery(
  userId: string,
  query: string
) {
  const chats = await listUserWhatsAppChats(userId);
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const exact = chats.find(
    (chat) =>
      chat.displayName.toLowerCase() === normalized ||
      chat.remoteJid.toLowerCase() === normalized
  );

  if (exact) {
    return exact;
  }

  return (
    chats.find(
      (chat) =>
        chat.displayName.toLowerCase().includes(normalized) ||
        chat.remoteJid.toLowerCase().includes(normalized)
    ) ?? null
  );
}

export async function getRecentMessagesForChat(
  userId: string,
  chatId: string,
  limit = 10
) {
  return db
    .select()
    .from(whatsappMessages)
    .where(
      and(
        eq(whatsappMessages.userId, userId),
        eq(whatsappMessages.chatId, chatId)
      )
    )
    .orderBy(desc(whatsappMessages.sentAt))
    .limit(limit);
}

export async function getMessagesForChatInWindow(
  userId: string,
  chatId: string,
  since: Date,
  until?: Date
) {
  const rows = await db
    .select()
    .from(whatsappMessages)
    .where(
      and(
        eq(whatsappMessages.userId, userId),
        eq(whatsappMessages.chatId, chatId)
      )
    )
    .orderBy(whatsappMessages.sentAt);

  return rows.filter((row) => {
    const sentAt = row.sentAt.getTime();
    if (sentAt < since.getTime()) {
      return false;
    }
    if (until && sentAt > until.getTime()) {
      return false;
    }
    return true;
  });
}
