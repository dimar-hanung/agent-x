import { and, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";

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
  eventSequence: number;
  message: WhatsAppIngestMessage;
}

function resolveDisplayName(message: WhatsAppIngestMessage): string {
  if (message.isGroup) {
    return message.remoteJid.replace(/@.*$/, "");
  }

  return message.senderName ?? message.senderPhoneE164 ?? message.remoteJid;
}

export async function ingestWhatsAppMessage(
  input: IngestMessageInput
): Promise<boolean> {
  const { userId, eventSequence, message } = input;

  if (!message.messageId || message.messageType !== "text") {
    return false;
  }

  const messageId = message.messageId;
  const sentAt = message.sentAt ?? new Date();
  const chatType: WhatsAppChatType = message.isGroup ? "group" : "dm";
  const displayName = resolveDisplayName(message);

  return db.transaction(async (tx) => {
    const [chat] = await tx
      .insert(whatsappChats)
      .values({
        userId,
        remoteJid: message.remoteJid,
        chatType,
        displayName,
        lastMessageAt: sentAt,
      })
      .onConflictDoUpdate({
        target: [whatsappChats.userId, whatsappChats.remoteJid],
        set: {
          displayName,
          chatType,
          lastMessageAt: sql`greatest(
            coalesce(${whatsappChats.lastMessageAt}, excluded.last_message_at),
            excluded.last_message_at
          )`,
          updatedAt: new Date(),
        },
      })
      .returning({ id: whatsappChats.id });

    if (!chat) {
      throw new Error("WhatsApp chat could not be upserted.");
    }

    const direction: WhatsAppMessageDirection = message.direction;
    const inserted = await tx
      .insert(whatsappMessages)
      .values({
        userId,
        chatId: chat.id,
        waMessageId: messageId,
        sourceEventSequence: eventSequence,
        senderJid: message.senderJid,
        senderName: message.senderName,
        direction,
        text: message.text,
        sentAt,
      })
      .onConflictDoNothing({
        target: [whatsappMessages.userId, whatsappMessages.waMessageId],
      })
      .returning({ id: whatsappMessages.id });

    return inserted.length > 0;
  });
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

export interface WhatsAppMessageWindowOptions {
  until?: Date;
  limit?: number;
  maxEventSequence?: number | null;
}

export async function getMessagesForChatInWindow(
  userId: string,
  chatId: string,
  since: Date,
  options?: WhatsAppMessageWindowOptions
) {
  const sourceSequenceCondition =
    options?.maxEventSequence === undefined
      ? undefined
      : options.maxEventSequence === null
        ? isNull(whatsappMessages.sourceEventSequence)
        : or(
            isNull(whatsappMessages.sourceEventSequence),
            lte(
              whatsappMessages.sourceEventSequence,
              options.maxEventSequence
            )
          );
  const where = and(
    eq(whatsappMessages.userId, userId),
    eq(whatsappMessages.chatId, chatId),
    gte(whatsappMessages.sentAt, since),
    options?.until ? lte(whatsappMessages.sentAt, options.until) : undefined,
    sourceSequenceCondition
  );

  if (options?.limit && options.limit > 0) {
    const rows = await db
      .select()
      .from(whatsappMessages)
      .where(where)
      .orderBy(desc(whatsappMessages.sentAt))
      .limit(options.limit);

    return rows.reverse();
  }

  return db
    .select()
    .from(whatsappMessages)
    .where(where)
    .orderBy(whatsappMessages.sentAt);
}
