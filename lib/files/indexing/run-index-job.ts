import {
  chunkHybridFile,
  convertFileToMarkdown,
  DoclingApiError,
  DoclingNotConfiguredError,
} from "@/lib/docling/client";
import {
  embedTexts,
  getEmbeddingModelLabel,
} from "@/lib/ai/embeddings/openrouter-embeddings";
import { getFileRow } from "@/lib/files/repository";
import {
  markIndexFailed,
  replaceFileChunks,
} from "@/lib/files/index-repository";
import { getObjectBytes } from "@/lib/files/s3-client";

function userFacingIndexError(error: unknown): string {
  if (error instanceof DoclingNotConfiguredError) {
    return "Docling belum dikonfigurasi.";
  }
  if (error instanceof DoclingApiError) {
    return "Gagal memproses dokumen di Docling.";
  }
  if (error instanceof Error && error.message.includes("OpenRouter")) {
    return "Gagal membuat embedding dokumen.";
  }
  return "Gagal mengindeks dokumen.";
}

export async function runIndexJobForFile(
  userId: string,
  fileId: string
): Promise<void> {
  const row = await getFileRow(userId, fileId);

  if (!row || row.kind !== "file" || row.status !== "ready" || !row.storageKey) {
    await markIndexFailed(fileId, "File tidak ditemukan atau belum siap.");
    return;
  }

  try {
    const { body: buffer } = await getObjectBytes(row.storageKey);

    const [chunkResponse, previewMarkdown] = await Promise.all([
      chunkHybridFile({ buffer, filename: row.name }),
      convertFileToMarkdown({ buffer, filename: row.name }).catch(() => ""),
    ]);

    const docChunks = chunkResponse.chunks ?? [];
    if (docChunks.length === 0) {
      await markIndexFailed(fileId, "Dokumen tidak menghasilkan chunk teks.");
      return;
    }

    const texts = docChunks.map((chunk) => chunk.text.trim()).filter(Boolean);
    if (texts.length === 0) {
      await markIndexFailed(fileId, "Chunk dokumen kosong.");
      return;
    }

    const embeddings = await embedTexts(texts);
    if (embeddings.length !== texts.length) {
      await markIndexFailed(fileId, "Jumlah embedding tidak sesuai chunk.");
      return;
    }

    let embedIdx = 0;
    const stored = docChunks
      .map((chunk) => {
        const text = chunk.text.trim();
        if (!text) {
          return null;
        }
        const embedding = embeddings[embedIdx];
        embedIdx += 1;
        return {
          chunkIndex: chunk.chunk_index,
          chunkText: text,
          rawText: chunk.raw_text ?? null,
          headings: chunk.headings ?? null,
          pageNumbers: chunk.page_numbers ?? null,
          embedding,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    let preview = previewMarkdown.trim();
    if (!preview) {
      preview = texts.join("\n\n").slice(0, 80_000);
    }

    await replaceFileChunks({
      fileId,
      userId,
      chunks: stored,
      previewMarkdown: preview || null,
    });

    console.info(
      `[files:index] ready file=${fileId} chunks=${stored.length} model=${getEmbeddingModelLabel()}`
    );
  } catch (error) {
    console.error(`[files:index] failed file=${fileId}:`, error);
    await markIndexFailed(fileId, userFacingIndexError(error));
  }
}
