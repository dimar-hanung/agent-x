import type { UserContext } from "@/lib/ai/roles/types";
import {
  AI_UPLOAD_MAX_BYTES,
  SEAWEEDFS_NOT_CONFIGURED_CODE,
  SEAWEEDFS_NOT_CONFIGURED_MESSAGE,
} from "@/lib/files/constants";
import { FilesError, uploadFileBytes } from "@/lib/files/repository";
import {
  SeaweedfsNotConfiguredError,
  isSeaweedfsConfigured,
} from "@/lib/files/s3-client";

import type { UploadFileInput } from "./schema";
import type { UploadFileToolResult } from "./types";

export async function executeUploadFile(
  input: UploadFileInput,
  ctx: { user: UserContext }
): Promise<UploadFileToolResult> {
  try {
    if (!isSeaweedfsConfigured()) {
      return {
        success: false,
        code: SEAWEEDFS_NOT_CONFIGURED_CODE,
        message: SEAWEEDFS_NOT_CONFIGURED_MESSAGE,
      };
    }

    let body: Buffer;
    const mimeType =
      input.mime_type?.trim() ||
      (input.content ? "text/plain" : "application/octet-stream");

    if (input.content && input.content.length > 0) {
      body = Buffer.from(input.content, "utf8");
    } else if (input.content_base64 && input.content_base64.length > 0) {
      body = Buffer.from(input.content_base64, "base64");
    } else {
      return {
        success: false,
        message: "Provide content or content_base64.",
      };
    }

    if (body.byteLength > AI_UPLOAD_MAX_BYTES) {
      return {
        success: false,
        message: `Ukuran file melebihi batas unggah AI (${AI_UPLOAD_MAX_BYTES / (1024 * 1024)} MB). Gunakan Dashboard → File untuk file lebih besar.`,
      };
    }

    const file = await uploadFileBytes(ctx.user.userId, {
      name: input.name,
      parentId: input.parent_id ?? null,
      mimeType,
      body,
    });

    return { success: true, data: file };
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
        error instanceof Error ? error.message : "Gagal mengunggah file.",
    };
  }
}
