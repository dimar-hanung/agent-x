import { and, count, desc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  MEMORY_PROMPT_LIMIT,
  MEMORY_SOFT_CAP,
  MEMORY_SOURCES,
  userMemories,
  type MemorySource,
} from "@/lib/db/schema";

import type { MemoryListItem } from "./schemas";

const memorySelect = {
  id: userMemories.id,
  content: userMemories.content,
  source: userMemories.source,
  createdAt: userMemories.createdAt,
  updatedAt: userMemories.updatedAt,
} as const;

export function normalizeMemoryContent(content: string): string {
  return content.trim().replace(/\s+/g, " ").toLowerCase();
}

function toListItem(row: {
  id: string;
  content: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}): MemoryListItem {
  const source = MEMORY_SOURCES.includes(row.source as MemorySource)
    ? (row.source as MemorySource)
    : "tool";

  return {
    id: row.id,
    content: row.content,
    source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listMemories(userId: string): Promise<MemoryListItem[]> {
  const rows = await db
    .select(memorySelect)
    .from(userMemories)
    .where(eq(userMemories.userId, userId))
    .orderBy(desc(userMemories.createdAt));

  return rows.map(toListItem);
}

export async function listMemoriesForPrompt(
  userId: string,
  limit = MEMORY_PROMPT_LIMIT
): Promise<MemoryListItem[]> {
  const rows = await db
    .select(memorySelect)
    .from(userMemories)
    .where(eq(userMemories.userId, userId))
    .orderBy(desc(userMemories.createdAt))
    .limit(limit);

  return rows.map(toListItem);
}

export async function countMemories(userId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(userMemories)
    .where(eq(userMemories.userId, userId));

  return row?.value ?? 0;
}

export async function findExistingNormalized(
  userId: string,
  content: string
): Promise<MemoryListItem | null> {
  const normalized = normalizeMemoryContent(content);

  if (!normalized) {
    return null;
  }

  const [row] = await db
    .select(memorySelect)
    .from(userMemories)
    .where(
      and(
        eq(userMemories.userId, userId),
        sql`lower(trim(regexp_replace(${userMemories.content}, '\\s+', ' ', 'g'))) = ${normalized}`
      )
    )
    .limit(1);

  return row ? toListItem(row) : null;
}

export async function createMemory(
  userId: string,
  input: { content: string; source?: MemorySource }
): Promise<MemoryListItem> {
  const content = input.content.trim().replace(/\s+/g, " ");

  if (!content) {
    throw new Error("Preference wajib diisi.");
  }

  const existing = await findExistingNormalized(userId, content);

  if (existing) {
    throw new Error("Preference sudah tersimpan.");
  }

  const total = await countMemories(userId);

  if (total >= MEMORY_SOFT_CAP) {
    throw new Error(
      `Memory penuh (maksimal ${MEMORY_SOFT_CAP}). Hapus preference lama dulu.`
    );
  }

  const source = input.source ?? "tool";

  const [row] = await db
    .insert(userMemories)
    .values({
      userId,
      content,
      source,
    })
    .returning(memorySelect);

  return toListItem(row);
}

export async function deleteMemory(
  userId: string,
  memoryId: string
): Promise<void> {
  const deleted = await db
    .delete(userMemories)
    .where(and(eq(userMemories.id, memoryId), eq(userMemories.userId, userId)))
    .returning({ id: userMemories.id });

  if (deleted.length === 0) {
    throw new Error("Memory tidak ditemukan.");
  }
}
