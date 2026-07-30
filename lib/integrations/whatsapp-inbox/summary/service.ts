import { generateText } from "ai";
import { and, desc, eq, gte } from "drizzle-orm";

import { getSummarizeModelInstance } from "@/lib/ai/context/resolve-summarize-model";
import { db } from "@/lib/db";
import {
  whatsappChatSummaries,
  whatsappChats,
  whatsappDigestSnapshots,
} from "@/lib/db/schema";
import {
  getDefaultDigestSince,
  getWhatsAppDigestChunkSize,
  getWhatsAppDigestMaxCharsPerChat,
  getWhatsAppDigestMaxMessagesPerChat,
} from "@/lib/integrations/whatsapp-inbox/config";
import {
  findWhatsAppChatByQuery,
  getMessagesForChatInWindow,
  getWhatsAppChatForUser,
  listUserWhatsAppChats,
} from "@/lib/integrations/whatsapp-inbox/ingest/service";
import { isUserInstanceConnected } from "@/lib/integrations/whatsapp-inbox/user-instance-repository";

import {
  buildExecutiveSummaryPrompt,
  buildMultiChatChunkPrompt,
  parseHighlightsFromSummary,
  type WhatsAppSummaryHighlights,
} from "./prompt";

const CHUNK_OUTPUT_TOKENS = 6000;

/**
 * DeepSeek V4 often puts the whole answer in reasoningText and leaves text empty,
 * especially on long multi-chat prompts. Prefer visible text; fall back to reasoning.
 */
async function generateSummaryText(options: {
  prompt: string;
  maxOutputTokens: number;
  abortSignal?: AbortSignal;
}): Promise<string> {
  const result = await generateText({
    model: await getSummarizeModelInstance(),
    prompt: options.prompt,
    maxOutputTokens: options.maxOutputTokens,
    abortSignal: options.abortSignal,
    reasoning: "none",
  });

  const visibleText = (result.text ?? "").trim();
  const reasoningText = (result.reasoningText ?? "").trim();
  return visibleText || reasoningText;
}

function formatTranscript(
  messages: Array<{
    senderName: string | null;
    direction: string;
    text: string;
    sentAt: Date;
  }>
): string {
  return messages
    .map((message) => {
      const who =
        message.senderName ??
        (message.direction === "outbound" ? "Saya" : "Kontak");
      const time = message.sentAt.toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
      });
      return `[${time}] ${who}: ${message.text}`;
    })
    .join("\n");
}

function capTranscript(transcript: string, maxChars: number): string {
  if (transcript.length <= maxChars) {
    return transcript;
  }

  return `${transcript.slice(0, maxChars)}\n… (dipotong)`;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export interface WhatsAppChatSummaryResult {
  chatId: string;
  chatName: string;
  chatType: "dm" | "group";
  summaryText: string;
  highlights: WhatsAppSummaryHighlights;
  coversFrom: string;
  coversTo: string;
  messageCount: number;
  generatedAt: string;
}

export interface WhatsAppDigestSnapshotResult {
  id: string;
  digestText: string;
  chatCount: number;
  chunkCount: number;
  coversFrom: string;
  coversTo: string;
  generatedAt: string;
}

interface ChatDigestInput {
  chatId: string;
  chatName: string;
  chatType: "dm" | "group";
  transcript: string;
  coversFrom: Date;
  coversTo: Date;
  messageCount: number;
}

function toSnapshotResult(row: {
  id: string;
  digestText: string;
  chatCount: number;
  chunkCount: number;
  coversFrom: Date;
  coversTo: Date;
  generatedAt: Date;
}): WhatsAppDigestSnapshotResult {
  return {
    id: row.id,
    digestText: row.digestText,
    chatCount: row.chatCount,
    chunkCount: row.chunkCount,
    coversFrom: row.coversFrom.toISOString(),
    coversTo: row.coversTo.toISOString(),
    generatedAt: row.generatedAt.toISOString(),
  };
}

async function persistSummary(
  userId: string,
  chatId: string,
  summaryText: string,
  highlights: WhatsAppSummaryHighlights,
  coversFrom: Date,
  coversTo: Date,
  messageCount: number
) {
  const [existing] = await db
    .select({ id: whatsappChatSummaries.id })
    .from(whatsappChatSummaries)
    .where(eq(whatsappChatSummaries.chatId, chatId))
    .limit(1);

  if (existing) {
    await db
      .update(whatsappChatSummaries)
      .set({
        summaryText,
        highlights,
        coversFrom,
        coversTo,
        messageCount,
        generatedAt: new Date(),
      })
      .where(eq(whatsappChatSummaries.id, existing.id));
    return;
  }

  await db.insert(whatsappChatSummaries).values({
    userId,
    chatId,
    summaryText,
    highlights,
    coversFrom,
    coversTo,
    messageCount,
  });
}

export async function getLatestChatSummary(userId: string, chatId: string) {
  const [summary] = await db
    .select()
    .from(whatsappChatSummaries)
    .where(
      and(
        eq(whatsappChatSummaries.userId, userId),
        eq(whatsappChatSummaries.chatId, chatId)
      )
    )
    .limit(1);

  return summary ?? null;
}

export async function getLatestDigestSnapshot(userId: string) {
  const [snapshot] = await db
    .select()
    .from(whatsappDigestSnapshots)
    .where(eq(whatsappDigestSnapshots.userId, userId))
    .orderBy(desc(whatsappDigestSnapshots.generatedAt))
    .limit(1);

  return snapshot ?? null;
}

export async function listDigestSnapshots(userId: string, limit = 20) {
  const capped = Math.min(Math.max(limit, 1), 50);

  return db
    .select()
    .from(whatsappDigestSnapshots)
    .where(eq(whatsappDigestSnapshots.userId, userId))
    .orderBy(desc(whatsappDigestSnapshots.generatedAt))
    .limit(capped);
}

async function loadChatDigestInputs(
  userId: string,
  activeChats: Array<{
    id: string;
    displayName: string;
    chatType: string;
  }>,
  since: Date
): Promise<ChatDigestInput[]> {
  const maxMessages = getWhatsAppDigestMaxMessagesPerChat();
  const maxChars = getWhatsAppDigestMaxCharsPerChat();
  const inputs: ChatDigestInput[] = [];

  for (const chat of activeChats) {
    const messages = await getMessagesForChatInWindow(userId, chat.id, since);

    if (messages.length === 0) {
      continue;
    }

    const cappedMessages = messages.slice(-maxMessages);
    const transcript = capTranscript(
      formatTranscript(cappedMessages),
      maxChars
    );

    inputs.push({
      chatId: chat.id,
      chatName: chat.displayName,
      chatType: chat.chatType as "dm" | "group",
      transcript,
      coversFrom: messages[0]!.sentAt,
      coversTo: messages[messages.length - 1]!.sentAt,
      messageCount: messages.length,
    });
  }

  return inputs;
}

export async function generateChatSummary(
  userId: string,
  chatId: string,
  options?: { since?: Date }
): Promise<WhatsAppChatSummaryResult | { success: false; message: string }> {
  const connected = await isUserInstanceConnected(userId);

  if (!connected) {
    return {
      success: false,
      message: "WhatsApp pribadi belum terhubung. Hubungkan di Settings → Integrations.",
    };
  }

  const chat = await getWhatsAppChatForUser(userId, chatId);

  if (!chat) {
    return { success: false, message: "Chat tidak ditemukan." };
  }

  const since = options?.since ?? getDefaultDigestSince();
  const messages = await getMessagesForChatInWindow(userId, chatId, since);

  if (messages.length === 0) {
    return {
      success: false,
      message: "Tidak ada pesan baru dalam rentang waktu ini.",
    };
  }

  const transcript = formatTranscript(messages);
  const text = await generateSummaryText({
    prompt: buildExecutiveSummaryPrompt(
      chat.displayName,
      chat.chatType as "dm" | "group",
      transcript,
      1500
    ),
    maxOutputTokens: 1500,
  });

  if (!text) {
    return {
      success: false,
      message: "Model tidak menghasilkan ringkasan. Coba lagi.",
    };
  }

  const coversFrom = messages[0]!.sentAt;
  const coversTo = messages[messages.length - 1]!.sentAt;
  const highlights = parseHighlightsFromSummary(text);

  await persistSummary(
    userId,
    chatId,
    text,
    highlights,
    coversFrom,
    coversTo,
    messages.length
  );

  return {
    chatId,
    chatName: chat.displayName,
    chatType: chat.chatType as "dm" | "group",
    summaryText: text,
    highlights,
    coversFrom: coversFrom.toISOString(),
    coversTo: coversTo.toISOString(),
    messageCount: messages.length,
    generatedAt: new Date().toISOString(),
  };
}

export async function generateChatSummaryByQuery(
  userId: string,
  query: string,
  options?: { since?: Date }
) {
  const chat = await findWhatsAppChatByQuery(userId, query);

  if (!chat) {
    return { success: false as const, message: "Chat tidak ditemukan." };
  }

  const result = await generateChatSummary(userId, chat.id, options);

  if ("success" in result && result.success === false) {
    return result;
  }

  return result;
}

type DigestResult =
  | WhatsAppDigestSnapshotResult
  | { success: false; message: string };

const digestInFlight = new Map<string, Promise<DigestResult>>();
const digestAbortControllers = new Map<string, AbortController>();

export function clearDigestInFlight(userId: string): void {
  digestInFlight.delete(userId);
  const controller = digestAbortControllers.get(userId);
  if (controller) {
    controller.abort();
    digestAbortControllers.delete(userId);
  }
}

export async function generateDigest(
  userId: string,
  options?: { since?: Date; abortSignal?: AbortSignal }
): Promise<DigestResult> {
  const existing = digestInFlight.get(userId);
  if (existing) {
    return existing;
  }

  const abortController = new AbortController();
  digestAbortControllers.set(userId, abortController);

  if (options?.abortSignal) {
    if (options.abortSignal.aborted) {
      clearDigestInFlight(userId);
      return {
        success: false,
        message: "Pembuatan ringkasan dibatalkan.",
      };
    }

    options.abortSignal.addEventListener(
      "abort",
      () => abortController.abort(),
      { once: true }
    );
  }

  const task = generateDigestInternal(userId, options, abortController.signal)
    .finally(() => {
      digestInFlight.delete(userId);
      const current = digestAbortControllers.get(userId);
      if (current === abortController) {
        digestAbortControllers.delete(userId);
      }
    });

  digestInFlight.set(userId, task);
  return task;
}

async function generateDigestInternal(
  userId: string,
  options: { since?: Date; abortSignal?: AbortSignal } | undefined,
  abortSignal: AbortSignal
): Promise<DigestResult> {
  if (abortSignal.aborted) {
    return {
      success: false,
      message: "Pembuatan ringkasan dibatalkan.",
    };
  }

  const connected = await isUserInstanceConnected(userId);

  if (!connected) {
    return {
      success: false,
      message: "WhatsApp pribadi belum terhubung. Hubungkan di Settings → Integrations.",
    };
  }

  const since = options?.since ?? getDefaultDigestSince();
  const chats = await listUserWhatsAppChats(userId);
  const activeChats = chats.filter(
    (chat) => chat.lastMessageAt && chat.lastMessageAt >= since
  );

  if (activeChats.length === 0) {
    return {
      success: false,
      message: "Tidak ada chat aktif dalam rentang waktu ini.",
    };
  }

  const chatInputs = await loadChatDigestInputs(userId, activeChats, since);

  if (chatInputs.length === 0) {
    return {
      success: false,
      message: "Tidak ada pesan untuk diringkas dalam rentang waktu ini.",
    };
  }

  const chunkSize = getWhatsAppDigestChunkSize();
  const inputChunks = chunkArray(chatInputs, chunkSize);
  const chunkTexts: string[] = [];

  for (let index = 0; index < inputChunks.length; index += 1) {
    if (abortSignal.aborted) {
      return {
        success: false,
        message: "Pembuatan ringkasan dibatalkan.",
      };
    }

    const chunk = inputChunks[index]!;
    const text = await generateSummaryText({
      prompt: buildMultiChatChunkPrompt(
        chunk.map((item) => ({
          chatName: item.chatName,
          chatType: item.chatType,
          transcript: item.transcript,
        })),
        {
          chunkIndex: index + 1,
          chunkCount: inputChunks.length,
          maxTokens: CHUNK_OUTPUT_TOKENS,
        }
      ),
      maxOutputTokens: CHUNK_OUTPUT_TOKENS,
      abortSignal,
    });

    if (!text) {
      return {
        success: false,
        message: "Model tidak menghasilkan ringkasan. Coba lagi.",
      };
    }

    chunkTexts.push(text);
  }

  const digestText =
    chunkTexts.length === 1
      ? chunkTexts[0]!
      : chunkTexts
          .map((text, index) => {
            const start = index * chunkSize + 1;
            const end = Math.min((index + 1) * chunkSize, chatInputs.length);
            return `## Bagian ${index + 1} (chat ${start}–${end})\n\n${text}`;
          })
          .join("\n\n");

  if (!digestText.trim()) {
    return {
      success: false,
      message: "Model tidak menghasilkan ringkasan. Coba lagi.",
    };
  }

  const coversFrom = chatInputs.reduce(
    (earliest, item) =>
      item.coversFrom < earliest ? item.coversFrom : earliest,
    chatInputs[0]!.coversFrom
  );
  const coversTo = chatInputs.reduce(
    (latest, item) => (item.coversTo > latest ? item.coversTo : latest),
    chatInputs[0]!.coversTo
  );

  const [inserted] = await db
    .insert(whatsappDigestSnapshots)
    .values({
      userId,
      digestText,
      chatCount: chatInputs.length,
      chunkCount: inputChunks.length,
      coversFrom,
      coversTo,
    })
    .returning();

  if (!inserted) {
    return {
      success: false,
      message: "Gagal menyimpan ringkasan.",
    };
  }

  return toSnapshotResult(inserted);
}

export async function listChatsWithSummaryFlag(userId: string) {
  const chats = await listUserWhatsAppChats(userId);
  const summaries = await db
    .select()
    .from(whatsappChatSummaries)
    .where(eq(whatsappChatSummaries.userId, userId));

  const summaryByChat = new Map(summaries.map((row) => [row.chatId, row]));

  return chats.map((chat) => ({
    id: chat.id,
    displayName: chat.displayName,
    chatType: chat.chatType,
    remoteJid: chat.remoteJid,
    lastMessageAt: chat.lastMessageAt?.toISOString() ?? null,
    hasSummary: summaryByChat.has(chat.id),
    latestSummaryAt:
      summaryByChat.get(chat.id)?.generatedAt.toISOString() ?? null,
  }));
}

export async function getActiveChatsSince(userId: string, since: Date) {
  return db
    .select()
    .from(whatsappChats)
    .where(
      and(
        eq(whatsappChats.userId, userId),
        gte(whatsappChats.lastMessageAt, since)
      )
    )
    .orderBy(desc(whatsappChats.lastMessageAt));
}
