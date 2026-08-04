import { and, desc, eq, gte, ilike } from "drizzle-orm";

import { db } from "@/lib/db";
import { whatsappChats, whatsappMessages } from "@/lib/db/schema";
import { getWhatsAppSearchMaxRowsPerKeyword } from "@/lib/integrations/whatsapp-inbox/config";
import { findWhatsAppChatByQuery } from "@/lib/integrations/whatsapp-inbox/ingest/service";
import { isUserInstanceConnected } from "@/lib/integrations/whatsapp-inbox/user-instance-repository";

export interface WhatsAppMessageSearchHit {
  messageId: string;
  chatId: string;
  chatName: string;
  chatType: string;
  remoteJid: string;
  senderName: string | null;
  direction: string;
  text: string;
  sentAt: string;
  matchedKeywords: string[];
}

export interface WhatsAppSearchChatGroup {
  chatId: string;
  chatName: string;
  chatType: string;
  remoteJid: string;
  messages: WhatsAppMessageSearchHit[];
}

export interface SearchWhatsAppMessagesInput {
  keywords: string[];
  chatQuery?: string;
  since?: Date;
}

export type SearchWhatsAppMessagesResult =
  | {
      success: true;
      results: WhatsAppMessageSearchHit[];
      chatFilter: string | null;
    }
  | { success: false; message: string };

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}

function normalizeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const keyword of keywords) {
    const trimmed = keyword.trim();
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(trimmed);
  }

  return normalized;
}

function mergeHits(
  existing: Map<string, WhatsAppMessageSearchHit>,
  rows: Array<{
    messageId: string;
    chatId: string;
    chatName: string;
    chatType: string;
    remoteJid: string;
    senderName: string | null;
    direction: string;
    text: string;
    sentAt: Date;
  }>,
  keyword: string
) {
  for (const row of rows) {
    const existingHit = existing.get(row.messageId);
    if (existingHit) {
      if (!existingHit.matchedKeywords.includes(keyword)) {
        existingHit.matchedKeywords.push(keyword);
      }
      continue;
    }

    existing.set(row.messageId, {
      messageId: row.messageId,
      chatId: row.chatId,
      chatName: row.chatName,
      chatType: row.chatType,
      remoteJid: row.remoteJid,
      senderName: row.senderName,
      direction: row.direction,
      text: row.text,
      sentAt: row.sentAt.toISOString(),
      matchedKeywords: [keyword],
    });
  }
}

export function groupSearchHitsByChat(
  results: WhatsAppMessageSearchHit[]
): WhatsAppSearchChatGroup[] {
  const byChat = new Map<string, WhatsAppSearchChatGroup>();

  for (const hit of results) {
    const group = byChat.get(hit.chatId);
    if (group) {
      group.messages.push(hit);
      continue;
    }

    byChat.set(hit.chatId, {
      chatId: hit.chatId,
      chatName: hit.chatName,
      chatType: hit.chatType,
      remoteJid: hit.remoteJid,
      messages: [hit],
    });
  }

  return Array.from(byChat.values());
}

export async function searchWhatsAppMessages(
  userId: string,
  input: SearchWhatsAppMessagesInput
): Promise<SearchWhatsAppMessagesResult> {
  const connected = await isUserInstanceConnected(userId);
  if (!connected) {
    return {
      success: false,
      message:
        "WhatsApp pribadi belum terhubung. Hubungkan di Settings → Integrations.",
    };
  }

  const keywords = normalizeKeywords(input.keywords);
  if (keywords.length === 0) {
    return {
      success: false,
      message: "Kata kunci pencarian tidak boleh kosong.",
    };
  }

  let chatId: string | undefined;
  let chatFilter: string | null = null;

  if (input.chatQuery?.trim()) {
    const chat = await findWhatsAppChatByQuery(userId, input.chatQuery);
    if (!chat) {
      return {
        success: false,
        message: "Chat tidak ditemukan.",
      };
    }

    chatId = chat.id;
    chatFilter = chat.displayName;
  }

  const hitMap = new Map<string, WhatsAppMessageSearchHit>();
  const maxRowsPerKeyword = getWhatsAppSearchMaxRowsPerKeyword();

  for (const keyword of keywords) {
    const pattern = `%${escapeIlikePattern(keyword)}%`;
    const conditions = [
      eq(whatsappMessages.userId, userId),
      ilike(whatsappMessages.text, pattern),
      input.since ? gte(whatsappMessages.sentAt, input.since) : undefined,
      chatId ? eq(whatsappMessages.chatId, chatId) : undefined,
    ];

    const rows = await db
      .select({
        messageId: whatsappMessages.id,
        chatId: whatsappMessages.chatId,
        chatName: whatsappChats.displayName,
        chatType: whatsappChats.chatType,
        remoteJid: whatsappChats.remoteJid,
        senderName: whatsappMessages.senderName,
        direction: whatsappMessages.direction,
        text: whatsappMessages.text,
        sentAt: whatsappMessages.sentAt,
      })
      .from(whatsappMessages)
      .innerJoin(whatsappChats, eq(whatsappMessages.chatId, whatsappChats.id))
      .where(and(...conditions))
      .orderBy(desc(whatsappMessages.sentAt))
      .limit(maxRowsPerKeyword);

    mergeHits(hitMap, rows, keyword);
  }

  const results = Array.from(hitMap.values()).sort(
    (left, right) =>
      new Date(right.sentAt).getTime() - new Date(left.sentAt).getTime()
  );

  return {
    success: true,
    results,
    chatFilter,
  };
}

export function dedupeSearchHits(
  existing: WhatsAppMessageSearchHit[],
  incoming: WhatsAppMessageSearchHit[]
): WhatsAppMessageSearchHit[] {
  const hitMap = new Map<string, WhatsAppMessageSearchHit>();

  for (const hit of existing) {
    hitMap.set(hit.messageId, { ...hit, matchedKeywords: [...hit.matchedKeywords] });
  }

  for (const hit of incoming) {
    const current = hitMap.get(hit.messageId);
    if (!current) {
      hitMap.set(hit.messageId, {
        ...hit,
        matchedKeywords: [...hit.matchedKeywords],
      });
      continue;
    }

    for (const keyword of hit.matchedKeywords) {
      if (!current.matchedKeywords.includes(keyword)) {
        current.matchedKeywords.push(keyword);
      }
    }
  }

  return Array.from(hitMap.values()).sort(
    (left, right) =>
      new Date(right.sentAt).getTime() - new Date(left.sentAt).getTime()
  );
}
