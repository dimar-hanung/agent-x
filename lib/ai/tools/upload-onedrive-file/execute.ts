import type { UserContext } from "@/lib/ai/roles/types";
import { uploadOneDriveFile } from "@/lib/microsoft/onedrive/client";

import { MICROSOFT_NOT_CONNECTED_MESSAGE } from "../microsoft/constants";
import type { UploadOnedriveFileInput } from "./schema";
import type { UploadOnedriveFileToolResult } from "./types";

export async function executeUploadOnedriveFile(
  input: UploadOnedriveFileInput,
  ctx: { user: UserContext }
): Promise<UploadOnedriveFileToolResult> {
  try {
    const file = await uploadOneDriveFile(ctx.user.userId, {
      name: input.name,
      content: input.content,
      contentBase64: input.content_base64,
      mimeType: input.mime_type,
      parentFolderId: input.parent_folder_id,
    });

    if (file === null) {
      return { success: false, message: MICROSOFT_NOT_CONNECTED_MESSAGE };
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
          : "Failed to upload file to OneDrive.",
    };
  }
}
