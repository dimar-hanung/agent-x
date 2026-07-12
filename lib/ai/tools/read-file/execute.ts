import type { UserContext } from "@/lib/ai/roles/types";
import {
  AI_READ_TEXT_MAX_CHARS,
  SEAWEEDFS_NOT_CONFIGURED_CODE,
  SEAWEEDFS_NOT_CONFIGURED_MESSAGE,
} from "@/lib/files/constants";
import { FilesError, getFileRow } from "@/lib/files/repository";
import {
  SeaweedfsNotConfiguredError,
  getObjectBytes,
  isSeaweedfsConfigured,
} from "@/lib/files/s3-client";

import type { ReadFileInput } from "./schema";
import type { ReadFileToolResult } from "./types";

function isProbablyText(mimeType: string | null, name: string): boolean {
  const mime = (mimeType ?? "").toLowerCase();
  if (
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "application/javascript" ||
    mime.endsWith("+json") ||
    mime.endsWith("+xml")
  ) {
    return true;
  }

  return /\.(txt|md|markdown|csv|json|xml|html|htm|js|ts|tsx|jsx|css|yml|yaml|log|env)$/i.test(
    name
  );
}

export async function executeReadFile(
  input: ReadFileInput,
  ctx: { user: UserContext }
): Promise<ReadFileToolResult> {
  try {
    if (!isSeaweedfsConfigured()) {
      return {
        success: false,
        code: SEAWEEDFS_NOT_CONFIGURED_CODE,
        message: SEAWEEDFS_NOT_CONFIGURED_MESSAGE,
      };
    }

    const row = await getFileRow(ctx.user.userId, input.file_id);

    if (!row || row.kind !== "file" || row.status !== "ready" || !row.storageKey) {
      return { success: false, message: "File tidak ditemukan." };
    }

    const file = {
      id: row.id,
      parentId: row.parentId,
      name: row.name,
      kind: "file" as const,
      mimeType: row.mimeType,
      sizeBytes: Number(row.sizeBytes ?? 0),
      status: "ready" as const,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };

    if (!isProbablyText(row.mimeType, row.name)) {
      return {
        success: true,
        data: {
          file,
          binary: true,
        },
        message:
          "File biner. Unduh lewat Dashboard → File. Metadata saja yang ditampilkan di sini.",
      };
    }

    const object = await getObjectBytes(row.storageKey);
    let content = object.body.toString("utf8");
    let truncated = false;

    if (content.length > AI_READ_TEXT_MAX_CHARS) {
      content = content.slice(0, AI_READ_TEXT_MAX_CHARS);
      truncated = true;
    }

    return {
      success: true,
      data: { file, content, truncated, binary: false },
    };
  } catch (error) {
    if (error instanceof SeaweedfsNotConfiguredError) {
      return {
        success: false,
        code: error.code,
        message: error.message,
      };
    }
    if (error instanceof FilesError) {
      return { success: false, message: error.message };
    }

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Gagal membaca file.",
    };
  }
}
