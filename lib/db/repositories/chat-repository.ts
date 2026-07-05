import { and, desc, eq, gt, lt } from "drizzle-orm";
import type { UIMessage } from "ai";
import { generateId } from "ai";

import type { StoredChatMessage } from "@/lib/ai/context/types";
import { db } from "@/lib/db";
import { chats, messages } from "@/lib/db/schema";
import { MAIN_CHANNEL_TITLE } from "@/lib/db/repositories/channel-repository";

const DEFAULT_CHAT_TITLE = "New chat";
const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 50;

export interface ChatSummary {
  id: string;
  title: string;
  updatedAt: Date;
}

export interface ChatContextMeta {
  contextSummary: string | null;
  summarizedUpToSequence: number;
  summaryUpdatedAt: Date | null;
}

export interface ChatMessagesPage {
  messages: StoredChatMessage[];
  hasMore: boolean;
  oldestSequence: number | null;
}

function mapRowToStoredMessage(row: {
  id: string;
  role: string;
  parts: unknown;
  metadata: unknown;
  sequence: number;
}): StoredChatMessage {
  return {
    id: row.id,
    role: row.role as UIMessage["role"],
    parts: row.parts as UIMessage["parts"],
    sequence: row.sequence,
    ...(row.metadata ? { metadata: row.metadata as Record<string, unknown> } : {}),
  };
}

function extractTitleFromMessages(allMessages: UIMessage[]): string | null {
  const firstUser = allMessages.find((message) => message.role === "user");

  if (!firstUser) {
    return null;
  }

  const textPart = firstUser.parts.find(
    (part): part is { type: "text"; text: string } =>
      part.type === "text" && typeof part.text === "string"
  );

  if (!textPart?.text.trim()) {
    return null;
  }

  const trimmed = textPart.text.trim();
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;
}

async function assertChatOwnership(chatId: string, userId: string) {
  const [owner] = await db
    .select({ userId: chats.userId })
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1);

  if (!owner || owner.userId !== userId) {
    throw new Error("Chat not found.");
  }
}

export async function createChat(userId: string): Promise<string> {
  const [chat] = await db
    .insert(chats)
    .values({ userId, kind: "conversation" })
    .returning({ id: chats.id });

  return chat.id;
}

export async function getChatOwner(chatId: string): Promise<string | null> {
  const [chat] = await db
    .select({ userId: chats.userId })
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1);

  return chat?.userId ?? null;
}

export async function createChatWithId(
  userId: string,
  chatId: string
): Promise<void> {
  await db
    .insert(chats)
    .values({ id: chatId, userId, kind: "conversation" })
    .onConflictDoNothing({ target: chats.id });
}

export async function listChatsForUser(userId: string): Promise<ChatSummary[]> {
  const rows = await db
    .select({
      id: chats.id,
      title: chats.title,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .where(and(eq(chats.userId, userId), eq(chats.kind, "conversation")))
    .orderBy(desc(chats.updatedAt));

  return rows;
}

export async function getChatContextMeta(
  chatId: string
): Promise<ChatContextMeta | null> {
  const [chat] = await db
    .select({
      contextSummary: chats.contextSummary,
      summarizedUpToSequence: chats.summarizedUpToSequence,
      summaryUpdatedAt: chats.summaryUpdatedAt,
    })
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1);

  return chat ?? null;
}

export async function updateChatContextSummary(
  chatId: string,
  contextSummary: string,
  summarizedUpToSequence: number
): Promise<void> {
  await db
    .update(chats)
    .set({
      contextSummary,
      summarizedUpToSequence,
      summaryUpdatedAt: new Date(),
    })
    .where(eq(chats.id, chatId));
}

export async function loadChatMessages(
  chatId: string,
  userId: string
): Promise<UIMessage[]> {
  const stored = await loadStoredChatMessages(chatId, userId);
  return stored.map(({ sequence: _sequence, ...message }) => message);
}

export async function loadStoredChatMessages(
  chatId: string,
  userId: string
): Promise<StoredChatMessage[]> {
  await assertChatOwnership(chatId, userId);

  const rows = await db
    .select({
      id: messages.id,
      role: messages.role,
      parts: messages.parts,
      metadata: messages.metadata,
      sequence: messages.sequence,
    })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.sequence);

  return rows.map(mapRowToStoredMessage);
}

export async function loadChatMessagesPage(
  chatId: string,
  userId: string,
  options: {
    limit?: number;
    before?: number;
    after?: number;
  } = {}
): Promise<ChatMessagesPage> {
  await assertChatOwnership(chatId, userId);

  const limit = Math.min(
    Math.max(options.limit ?? DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  );

  if (options.after !== undefined) {
    const rows = await db
      .select({
        id: messages.id,
        role: messages.role,
        parts: messages.parts,
        metadata: messages.metadata,
        sequence: messages.sequence,
      })
      .from(messages)
      .where(
        and(eq(messages.chatId, chatId), gt(messages.sequence, options.after))
      )
      .orderBy(messages.sequence)
      .limit(limit);

    const mapped = rows.map(mapRowToStoredMessage);

    return {
      messages: mapped,
      hasMore: mapped.length === limit,
      oldestSequence: mapped[0]?.sequence ?? null,
    };
  }

  const baseQuery = db
    .select({
      id: messages.id,
      role: messages.role,
      parts: messages.parts,
      metadata: messages.metadata,
      sequence: messages.sequence,
    })
    .from(messages)
    .where(
      options.before !== undefined
        ? and(eq(messages.chatId, chatId), lt(messages.sequence, options.before))
        : eq(messages.chatId, chatId)
    )
    .orderBy(desc(messages.sequence))
    .limit(limit + 1);

  const rows = await baseQuery;
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const ordered = [...pageRows].reverse();
  const mapped = ordered.map(mapRowToStoredMessage);

  return {
    messages: mapped,
    hasMore,
    oldestSequence: mapped[0]?.sequence ?? null,
  };
}

export async function saveChat({
  chatId,
  userId,
  allMessages,
}: {
  chatId: string;
  userId: string;
  allMessages: UIMessage[];
}): Promise<void> {
  const [chat] = await db
    .select({ id: chats.id, title: chats.title, kind: chats.kind })
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1);

  if (!chat) {
    throw new Error("Chat not found.");
  }

  await assertChatOwnership(chatId, userId);

  await db.transaction(async (tx) => {
    await tx.delete(messages).where(eq(messages.chatId, chatId));

    if (allMessages.length > 0) {
      await tx.insert(messages).values(
        allMessages.map((message, index) => ({
          id: message.id || generateId(),
          chatId,
          role: message.role,
          parts: message.parts,
          metadata: "metadata" in message ? message.metadata : null,
          sequence: index,
        }))
      );
    }

    const title =
      chat.kind === "channel"
        ? MAIN_CHANNEL_TITLE
        : chat.title === DEFAULT_CHAT_TITLE
          ? extractTitleFromMessages(allMessages) ?? DEFAULT_CHAT_TITLE
          : chat.title;

    await tx
      .update(chats)
      .set({ title, updatedAt: new Date() })
      .where(eq(chats.id, chatId));
  });
}

export async function verifyChatOwnership(
  chatId: string,
  userId: string
): Promise<boolean> {
  const [chat] = await db
    .select({ userId: chats.userId })
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1);

  return chat?.userId === userId;
}
