import type { UserContext } from "@/lib/ai/roles/types";
import { searchOneDriveFiles } from "@/lib/microsoft/onedrive/client";

import { MICROSOFT_NOT_CONNECTED_MESSAGE } from "../microsoft/constants";
import type { SearchOnedriveInput } from "./schema";
import type { SearchOnedriveToolResult } from "./types";

export async function executeSearchOnedrive(
  input: SearchOnedriveInput,
  ctx: { user: UserContext }
): Promise<SearchOnedriveToolResult> {
  try {
    const files = await searchOneDriveFiles(ctx.user.userId, {
      query: input.query,
      maxResults: input.max_results,
    });

    if (files === null) {
      return { success: false, message: MICROSOFT_NOT_CONNECTED_MESSAGE };
    }

    return {
      success: true,
      data: { files },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to search OneDrive.",
    };
  }
}
