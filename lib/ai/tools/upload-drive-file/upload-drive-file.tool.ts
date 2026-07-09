import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeUploadDriveFile } from "./execute";
import { uploadDriveFileInputSchema } from "./schema";

export function createUploadDriveFileTool(user: UserContext) {
  return tool({
    description:
      "Upload a file to the user's Google Drive. Prefer UTF-8 `content` for text/markdown/CSV/JSON. Use `content_base64` for binary. Set convert_to_google_doc true to create a Google Doc from text. Max 5 MB. Confirm the file name when ambiguous.",
    inputSchema: uploadDriveFileInputSchema,
    execute: (input) => executeUploadDriveFile(input, { user }),
  });
}
