import type { UserContext } from "@/lib/ai/roles/types";
import { readDriveFile } from "@/lib/google/drive/client";

import { GOOGLE_NOT_CONNECTED_MESSAGE } from "../google/constants";
import type { ReadDriveFileInput } from "./schema";
import type { ReadDriveFileToolResult } from "./types";

export async function executeReadDriveFile(
  input: ReadDriveFileInput,
  ctx: { user: UserContext }
): Promise<ReadDriveFileToolResult> {
  try {
    const file = await readDriveFile(ctx.user.userId, input.file_id);

    if (file === null) {
      return { success: false, message: GOOGLE_NOT_CONNECTED_MESSAGE };
    }

    return {
      success: true,
      data: file,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to read Google Drive file.",
    };
  }
}
