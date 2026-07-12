import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeReadFile } from "./execute";
import { readFileInputSchema } from "./schema";

export function createReadFileTool(user: UserContext) {
  return tool({
    description:
      "Read a file from the user's AgentX private storage by file_id (not Google Drive). Returns text content for text-like files; for binary files returns metadata only.",
    inputSchema: readFileInputSchema,
    execute: (input) => executeReadFile(input, { user }),
  });
}
