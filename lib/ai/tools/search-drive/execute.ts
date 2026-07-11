import type { UserContext } from "@/lib/ai/roles/types";
import { searchDriveFiles } from "@/lib/google/drive/client";

import { GOOGLE_NOT_CONNECTED_MESSAGE } from "../google/constants";
import type { SearchDriveInput } from "./schema";
import type { SearchDriveToolResult } from "./types";

export async function executeSearchDrive(
  input: SearchDriveInput,
  ctx: { user: UserContext }
): Promise<SearchDriveToolResult> {
  try {
    const files = await searchDriveFiles(ctx.user.userId, {
      query: input.query,
      maxResults: input.max_results,
    });

    if (files === null) {
      return { success: false, message: GOOGLE_NOT_CONNECTED_MESSAGE };
    }

    return {
      success: true,
      data: { files },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to search Google Drive.",
    };
  }
}
