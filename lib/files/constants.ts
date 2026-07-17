/** Per-user storage hard cap (20 GiB). */
export const USER_STORAGE_QUOTA_BYTES = 20 * 1024 * 1024 * 1024;

/** Max payload for AI `upload_file` tool (matches Drive tool). */
export const AI_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

/** Max declared size for browser upload-session (single PUT). */
export const BROWSER_UPLOAD_MAX_BYTES = 2 * 1024 * 1024 * 1024;

/** Presigned URL TTL. */
export const PRESIGNED_URL_EXPIRES_SECONDS = 15 * 60;

/** Max UTF-8 chars returned by `read_file` for text content. */
export const AI_READ_TEXT_MAX_CHARS = 50_000;

export const SEAWEEDFS_NOT_CONFIGURED_CODE = "SEAWEEDFS_NOT_CONFIGURED";

export const SEAWEEDFS_NOT_CONFIGURED_MESSAGE =
  "Penyimpanan file belum tersedia karena konfigurasi server belum lengkap.";

export const DOCLING_NOT_CONFIGURED_CODE = "DOCLING_NOT_CONFIGURED";

export const DOCLING_NOT_CONFIGURED_MESSAGE =
  "Pengindeksan dokumen belum tersedia karena Docling belum dikonfigurasi.";

export const INDEXABLE_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const INDEXABLE_EXTENSIONS = /\.(pdf|docx)$/i;

export function isIndexableFile(
  mimeType: string | null | undefined,
  name: string
): boolean {
  const mime = (mimeType ?? "").toLowerCase();
  if (
    INDEXABLE_MIME_TYPES.includes(
      mime as (typeof INDEXABLE_MIME_TYPES)[number]
    )
  ) {
    return true;
  }
  return INDEXABLE_EXTENSIONS.test(name);
}

export function isPdfFile(
  mimeType: string | null | undefined,
  name: string
): boolean {
  const mime = (mimeType ?? "").toLowerCase();
  if (mime === "application/pdf") {
    return true;
  }
  return /\.pdf$/i.test(name);
}

export function isDocxFile(
  mimeType: string | null | undefined,
  name: string
): boolean {
  const mime = (mimeType ?? "").toLowerCase();
  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return true;
  }
  return /\.docx$/i.test(name);
}
