import { and, asc, eq, sql } from "drizzle-orm";

import { getEmbeddingModelLabel } from "@/lib/ai/embeddings/openrouter-embeddings";
import { db } from "@/lib/db";
import { toVectorLiteral } from "@/lib/db/pgvector";
import {
  userFileChunks,
  userFileIndexes,
  type UserFileIndexStatus,
} from "@/lib/db/schema";

export interface FileIndexStatus {
  fileId: string;
  status: UserFileIndexStatus;
  chunkCount: number;
  errorMessage: string | null;
  indexedAt: Date | null;
}

export interface RetrievedFileChunk {
  chunkIndex: number;
  chunkText: string;
  headings: string[] | null;
  pageNumbers: number[] | null;
  distance: number;
}

export async function enqueueFileIndex(
  userId: string,
  fileId: string
): Promise<void> {
  await db
    .insert(userFileIndexes)
    .values({
      fileId,
      userId,
      status: "pending",
      errorMessage: null,
      chunkCount: 0,
      previewMarkdown: null,
      embeddingModel: null,
      indexedAt: null,
    })
    .onConflictDoUpdate({
      target: userFileIndexes.fileId,
      set: {
        status: "pending",
        errorMessage: null,
        chunkCount: 0,
        previewMarkdown: null,
        embeddingModel: null,
        indexedAt: null,
        updatedAt: new Date(),
      },
    });
}

export async function getFileIndexStatus(
  userId: string,
  fileId: string
): Promise<FileIndexStatus | null> {
  const [row] = await db
    .select({
      fileId: userFileIndexes.fileId,
      status: userFileIndexes.status,
      chunkCount: userFileIndexes.chunkCount,
      errorMessage: userFileIndexes.errorMessage,
      indexedAt: userFileIndexes.indexedAt,
    })
    .from(userFileIndexes)
    .where(
      and(
        eq(userFileIndexes.fileId, fileId),
        eq(userFileIndexes.userId, userId)
      )
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    fileId: row.fileId,
    status: row.status as UserFileIndexStatus,
    chunkCount: row.chunkCount,
    errorMessage: row.errorMessage,
    indexedAt: row.indexedAt,
  };
}

export async function getPreviewMarkdown(
  userId: string,
  fileId: string
): Promise<string | null> {
  const [row] = await db
    .select({ previewMarkdown: userFileIndexes.previewMarkdown })
    .from(userFileIndexes)
    .where(
      and(
        eq(userFileIndexes.fileId, fileId),
        eq(userFileIndexes.userId, userId)
      )
    )
    .limit(1);

  return row?.previewMarkdown ?? null;
}

export interface PreviewChunk {
  chunkIndex: number;
  text: string;
  rawText: string | null;
  headings: string[] | null;
  pageNumbers: number[] | null;
}

/** Ordered chunks for Tanya isi preview panel. */
export async function listPreviewChunks(
  userId: string,
  fileId: string
): Promise<PreviewChunk[]> {
  const rows = await db
    .select({
      chunkIndex: userFileChunks.chunkIndex,
      chunkText: userFileChunks.chunkText,
      rawText: userFileChunks.rawText,
      headings: userFileChunks.headings,
      pageNumbers: userFileChunks.pageNumbers,
    })
    .from(userFileChunks)
    .where(
      and(eq(userFileChunks.fileId, fileId), eq(userFileChunks.userId, userId))
    )
    .orderBy(asc(userFileChunks.chunkIndex));

  return rows.map((row) => ({
    chunkIndex: row.chunkIndex,
    text: row.chunkText,
    rawText: row.rawText ?? null,
    headings: (row.headings as string[] | null) ?? null,
    pageNumbers: (row.pageNumbers as number[] | null) ?? null,
  }));
}

/** Fallback concatenated preview when Docling md convert was empty. */
export async function getPreviewTextFromChunks(
  userId: string,
  fileId: string,
  maxChars = 80_000
): Promise<string | null> {
  const rows = await listPreviewChunks(userId, fileId);

  if (rows.length === 0) {
    return null;
  }

  let text = "";
  for (const row of rows) {
    const next = text ? `${text}\n\n${row.text}` : row.text;
    if (next.length > maxChars) {
      text = `${next.slice(0, maxChars)}\n\n…`;
      break;
    }
    text = next;
  }

  return text || null;
}

export interface ClaimedIndexJob {
  fileId: string;
  userId: string;
}

export async function claimNextIndexJob(): Promise<ClaimedIndexJob | null> {
  return db.transaction(async (tx) => {
    const result = await tx.execute(sql`
      SELECT file_id, user_id
      FROM user_file_indexes
      WHERE status = 'pending'
      ORDER BY created_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `);

    const row = result[0] as
      | { file_id: string; user_id: string }
      | undefined;

    if (!row) {
      return null;
    }

    await tx
      .update(userFileIndexes)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(userFileIndexes.fileId, row.file_id));

    return { fileId: row.file_id, userId: row.user_id };
  });
}

export async function markIndexFailed(
  fileId: string,
  message: string
): Promise<void> {
  await db
    .update(userFileIndexes)
    .set({
      status: "failed",
      errorMessage: message,
      updatedAt: new Date(),
    })
    .where(eq(userFileIndexes.fileId, fileId));
}

export async function replaceFileChunks({
  fileId,
  userId,
  chunks,
  previewMarkdown,
}: {
  fileId: string;
  userId: string;
  chunks: Array<{
    chunkIndex: number;
    chunkText: string;
    rawText?: string | null;
    headings?: string[] | null;
    pageNumbers?: number[] | null;
    embedding: number[];
  }>;
  previewMarkdown: string | null;
}): Promise<void> {
  const embeddingModel = getEmbeddingModelLabel();

  await db.transaction(async (tx) => {
    await tx
      .delete(userFileChunks)
      .where(
        and(
          eq(userFileChunks.fileId, fileId),
          eq(userFileChunks.userId, userId)
        )
      );

    if (chunks.length > 0) {
      await tx.insert(userFileChunks).values(
        chunks.map((chunk) => ({
          fileId,
          userId,
          chunkIndex: chunk.chunkIndex,
          chunkText: chunk.chunkText,
          rawText: chunk.rawText ?? null,
          headings: chunk.headings ?? null,
          pageNumbers: chunk.pageNumbers ?? null,
          embedding: chunk.embedding,
        }))
      );
    }

    await tx
      .update(userFileIndexes)
      .set({
        status: "ready",
        errorMessage: null,
        previewMarkdown,
        chunkCount: chunks.length,
        embeddingModel,
        indexedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userFileIndexes.fileId, fileId));
  });
}

export async function searchFileChunks({
  userId,
  fileId,
  queryEmbedding,
  limit = 8,
}: {
  userId: string;
  fileId: string;
  queryEmbedding: number[];
  limit?: number;
}): Promise<RetrievedFileChunk[]> {
  const literal = toVectorLiteral(queryEmbedding);
  const vectorSql = sql.raw(`'${literal}'::vector`);

  const rows = await db.execute(sql`
    SELECT
      chunk_index,
      chunk_text,
      headings,
      page_numbers,
      (embedding <=> ${vectorSql}) AS distance
    FROM user_file_chunks
    WHERE user_id = ${userId}
      AND file_id = ${fileId}
    ORDER BY embedding <=> ${vectorSql}
    LIMIT ${limit}
  `);

  return (rows as unknown as Array<Record<string, unknown>>).map((row) => ({
    chunkIndex: Number(row.chunk_index),
    chunkText: String(row.chunk_text),
    headings: (row.headings as string[] | null) ?? null,
    pageNumbers: (row.page_numbers as number[] | null) ?? null,
    distance: Number(row.distance),
  }));
}

export async function deleteFileIndexData(fileId: string): Promise<void> {
  await db
    .delete(userFileIndexes)
    .where(eq(userFileIndexes.fileId, fileId));
}
