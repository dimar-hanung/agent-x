import { embedQuery } from "@/lib/ai/embeddings/openrouter-embeddings";
import type { UserContext } from "@/lib/ai/roles/types";
import { isIndexableFile } from "@/lib/files/constants";
import {
  getFileIndexStatus,
  searchFileChunks,
} from "@/lib/files/index-repository";
import { getFileRow } from "@/lib/files/repository";

export class FileRagError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "FileRagError";
    this.status = status;
  }
}

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

export async function buildFileRagSystemAppendix({
  user,
  fileId,
  userQuestion,
}: {
  user: UserContext;
  fileId: string;
  userQuestion: string;
}): Promise<string> {
  const file = await getFileRow(user.userId, fileId);

  if (!file || file.kind !== "file" || file.status !== "ready") {
    throw new FileRagError(404, "File tidak ditemukan.");
  }

  if (!isIndexableFile(file.mimeType, file.name)) {
    throw new FileRagError(400, "File ini tidak didukung untuk tanya isi.");
  }

  const index = await getFileIndexStatus(user.userId, fileId);
  if (!index || index.status !== "ready") {
    throw new FileRagError(
      409,
      index?.status === "failed"
        ? index.errorMessage ?? "Gagal mengindeks dokumen."
        : "Dokumen sedang diindeks. Coba lagi sebentar."
    );
  }

  const queryEmbedding = await embedQuery(userQuestion);
  const chunks = await searchFileChunks({
    userId: user.userId,
    fileId,
    queryEmbedding,
    limit: 8,
  });

  if (chunks.length === 0) {
    throw new FileRagError(409, "Belum ada chunk untuk dokumen ini.");
  }

  const context = chunks.map(formatChunkBlock).join("\n\n---\n\n");

  return `
## Mode tanya isi file

Anda menjawab pertanyaan tentang file: **${file.name}** (id: ${fileId}).
Gunakan **hanya** cuplikan dokumen di bawah. Jika jawaban tidak ada di cuplikan, katakan dengan jelas bahwa informasi tidak ditemukan di dokumen — jangan mengarang.

Cuplikan dokumen (hasil pencarian vektor):

${context}
`.trim();
}
