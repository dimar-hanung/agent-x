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
