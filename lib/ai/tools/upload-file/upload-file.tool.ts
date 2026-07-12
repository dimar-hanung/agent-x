import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeUploadFile } from "./execute";
import { uploadFileInputSchema } from "./schema";

export function createUploadFileTool(user: UserContext) {
  return tool({
    description:
      "Upload a file into the user's AgentX private storage (not Google Drive). Prefer UTF-8 text via content; use content_base64 for binary. Max 5 MB via this tool.",
    inputSchema: uploadFileInputSchema,
    execute: (input) => executeUploadFile(input, { user }),
  });
}
