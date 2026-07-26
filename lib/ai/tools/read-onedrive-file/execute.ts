import type { UserContext } from "@/lib/ai/roles/types";
import { readOneDriveFile } from "@/lib/microsoft/onedrive/client";

import { MICROSOFT_NOT_CONNECTED_MESSAGE } from "../microsoft/constants";
import type { ReadOnedriveFileInput } from "./schema";
import type { ReadOnedriveFileToolResult } from "./types";

export async function executeReadOnedriveFile(
  input: ReadOnedriveFileInput,
  ctx: { user: UserContext }
): Promise<ReadOnedriveFileToolResult> {
  try {
    const file = await readOneDriveFile(ctx.user.userId, input.file_id);

    if (!file) {
      return {
        success: false,
        message: `No file found with id ${input.file_id}.`,
      };
    }

    return {
      success: true,
      data: file,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to read OneDrive file.",
    };
  }
}
