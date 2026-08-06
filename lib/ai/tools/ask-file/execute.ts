import { embedQuery } from "@/lib/ai/embeddings/openrouter-embeddings";
import type { UserContext } from "@/lib/ai/roles/types";
import { isDoclingConfigured } from "@/lib/docling/env";
import { isIndexableFile } from "@/lib/files/constants";
import {
  getFileIndexStatus,
  searchFileChunks,
} from "@/lib/files/index-repository";
import { getFileRow } from "@/lib/files/repository";

import type { AskFileInput } from "./schema";
import type { AskFileToolResult } from "./types";

function formatChunkBlock(
  chunk: Awaited<ReturnType<typeof searchFileChunks>>[number],
  index: number
): string {
  const pages =
    chunk.pageNumbers && chunk.pageNumbers.length > 0
      ? `hal. ${chunk.pageNumbers.join(", ")}`
      : "hal. tidak diketahui";
  const headings =
    chunk.headings && chunk.headings.length > 0
      ? chunk.headings.join(" › ")
      : null;

  const header = headings
    ? `[Cuplikan ${index + 1} · ${pages} · ${headings}]`
    : `[Cuplikan ${index + 1} · ${pages}]`;

  return `${header}\n${chunk.chunkText}`;
}

export async function executeAskFile(
  input: AskFileInput,
  ctx: { user: UserContext }
): Promise<AskFileToolResult> {
  const file = await getFileRow(ctx.user.userId, input.file_id);

  if (!file || file.kind !== "file" || file.status !== "ready") {
    return {
      success: false,
      message: "File tidak ditemukan.",
    };
  }

  const fileName = file.name;

  if (!isIndexableFile(file.mimeType, file.name)) {
    return {
      success: false,
      message: `File **${fileName}** tidak didukung untuk tanya isi. Gunakan read_file untuk metadata atau unduh lewat Dashboard → File.`,
      data: {
        fileId: file.id,
        fileName,
        indexStatus: "none",
      },
    };
  }

  if (!isDoclingConfigured()) {
    return {
      success: false,
      message: `Indeks dokumen belum dikonfigurasi. File **${fileName}** tersimpan, tetapi isinya belum bisa dibaca otomatis.`,
      data: {
        fileId: file.id,
        fileName,
        indexStatus: "none",
      },
    };
  }

  const index = await getFileIndexStatus(ctx.user.userId, file.id);

  if (index?.status === "failed") {
    return {
      success: false,
      message:
        index.errorMessage ??
        `Gagal mengindeks **${fileName}**. Coba unggah ulang atau unduh lewat Dashboard → File.`,
      data: {
        fileId: file.id,
        fileName,
        indexStatus: index.status,
      },
    };
  }

  // Indexing in progress is not a failure — avoid WhatsApp ❌ soft-fail notify.
  if (!index || index.status !== "ready") {
    return {
      success: true,
      message: `File **${fileName}** masih disiapkan (diindeks). Beritahu user bahwa file sudah tersimpan dan sedang dibaca — minta mereka tanya lagi sebentar. Jangan bilang gagal. Sistem akan memberi tahu saat siap.`,
      data: {
        fileId: file.id,
        fileName,
        indexStatus: index?.status ?? "none",
      },
    };
  }

  const queryEmbedding = await embedQuery(input.query);
  const chunks = await searchFileChunks({
    userId: ctx.user.userId,
    fileId: file.id,
    queryEmbedding,
    limit: 8,
  });

  if (chunks.length === 0) {
    return {
      success: false,
      message: `Belum ada cuplikan untuk **${fileName}**. Coba tanya lagi sebentar.`,
      data: {
        fileId: file.id,
        fileName,
        indexStatus: index.status,
      },
    };
  }

  const formattedChunks = chunks.map((chunk, chunkIndex) =>
    formatChunkBlock(chunk, chunkIndex)
  );

  return {
    success: true,
    message: `Cuplikan dari **${fileName}** untuk pertanyaan pengguna:\n\n${formattedChunks.join("\n\n---\n\n")}`,
    data: {
      fileId: file.id,
      fileName,
      indexStatus: index.status,
      chunks: chunks.map((chunk) => ({
        chunkIndex: chunk.chunkIndex,
        chunkText: chunk.chunkText,
        headings: chunk.headings,
        pageNumbers: chunk.pageNumbers,
      })),
    },
  };
}
