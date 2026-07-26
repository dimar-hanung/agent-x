import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeUploadOnedriveFile } from "./execute";
import { uploadOnedriveFileInputSchema } from "./schema";

export function createUploadOnedriveFileTool(user: UserContext) {
  return tool({
    description:
      "Upload a file to the user's connected Microsoft OneDrive. Max 5 MB. Prefer text content for notes.",
    inputSchema: uploadOnedriveFileInputSchema,
    execute: (input) => executeUploadOnedriveFile(input, { user }),
  });
}
