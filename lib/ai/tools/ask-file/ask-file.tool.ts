import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeAskFile } from "./execute";
import { askFileInputSchema } from "./schema";

export function createAskFileTool(user: UserContext) {
  return tool({
    description:
      "Answer questions about an indexed PDF or DOCX in AgentX storage by file_id. Returns relevant document chunks when indexing is ready; otherwise reports index status. Always includes the file name in the result.",
    inputSchema: askFileInputSchema,
    execute: (input) => executeAskFile(input, { user }),
  });
}
