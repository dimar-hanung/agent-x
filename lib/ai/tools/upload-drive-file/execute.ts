import type { UserContext } from "@/lib/ai/roles/types";
import { uploadDriveFile } from "@/lib/google/drive/client";

import { GOOGLE_NOT_CONNECTED_MESSAGE } from "../google/constants";
import type { UploadDriveFileInput } from "./schema";
import type { UploadDriveFileToolResult } from "./types";

const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";

export async function executeUploadDriveFile(
  input: UploadDriveFileInput,
  ctx: { user: UserContext }
): Promise<UploadDriveFileToolResult> {
  try {
    const file = await uploadDriveFile(ctx.user.userId, {
      name: input.name,
      content: input.content,
      contentBase64: input.content_base64,
      mimeType: input.mime_type,
      convertToGoogleMime: input.convert_to_google_doc
        ? GOOGLE_DOC_MIME
        : undefined,
      parentFolderId: input.parent_folder_id,
    });

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
          : "Failed to upload file to Google Drive.",
    };
  }
}
