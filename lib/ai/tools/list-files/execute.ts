import type { UserContext } from "@/lib/ai/roles/types";
import {
  SEAWEEDFS_NOT_CONFIGURED_CODE,
  SEAWEEDFS_NOT_CONFIGURED_MESSAGE,
} from "@/lib/files/constants";
import { FilesError, listFiles } from "@/lib/files/repository";
import {
  SeaweedfsNotConfiguredError,
  isSeaweedfsConfigured,
} from "@/lib/files/s3-client";

import type { ListFilesInput } from "./schema";
import type { ListFilesToolResult } from "./types";

export async function executeListFiles(
  input: ListFilesInput,
  ctx: { user: UserContext }
): Promise<ListFilesToolResult> {
  try {
    if (!isSeaweedfsConfigured()) {
      return {
        success: false,
        code: SEAWEEDFS_NOT_CONFIGURED_CODE,
        message: SEAWEEDFS_NOT_CONFIGURED_MESSAGE,
      };
    }

    const parentId = input.parent_id ?? null;
    const files = await listFiles(ctx.user.userId, parentId);

    return {
      success: true,
      data: { files, parent_id: parentId },
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
        error instanceof Error ? error.message : "Gagal memuat daftar file.",
    };
  }
}
