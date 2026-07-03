import { desc, eq } from "drizzle-orm";
import type { UIMessage } from "ai";
import { generateId } from "ai";

import { db } from "@/lib/db";
import { chats, messages } from "@/lib/db/schema";

const DEFAULT_CHAT_TITLE = "New chat";

export interface ChatSummary {
  id: string;
  title: string;
  updatedAt: Date;
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

export async function createChat(userId: string): Promise<string> {
  const [chat] = await db
    .insert(chats)
    .values({ userId })
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
    .values({ id: chatId, userId })
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
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt));

  return rows;
}

export async function loadChatMessages(
  chatId: string,
  userId: string
): Promise<UIMessage[]> {
  const [chat] = await db
    .select({ id: chats.id })
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1);

  if (!chat) {
    throw new Error("Chat not found.");
  }

  const [owner] = await db
    .select({ userId: chats.userId })
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1);

  if (!owner || owner.userId !== userId) {
    throw new Error("Chat not found.");
  }

  const rows = await db
    .select({
      id: messages.id,
      role: messages.role,
      parts: messages.parts,
      metadata: messages.metadata,
    })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.sequence);

  return rows.map((row) => ({
    id: row.id,
    role: row.role as UIMessage["role"],
    parts: row.parts as UIMessage["parts"],
    ...(row.metadata ? { metadata: row.metadata as Record<string, unknown> } : {}),
  }));
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
    .select({ id: chats.id, title: chats.title })
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1);

  if (!chat) {
    throw new Error("Chat not found.");
  }

  const [owner] = await db
    .select({ userId: chats.userId })
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1);

  if (!owner || owner.userId !== userId) {
    throw new Error("Chat not found.");
  }

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
      chat.title === DEFAULT_CHAT_TITLE
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
