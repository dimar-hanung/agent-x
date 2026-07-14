import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeListFiles } from "./execute";
import { listFilesInputSchema } from "./schema";

export function createListFilesTool(user: UserContext) {
  return tool({
    description:
      "List files and folders in the user's AgentX private storage (not Google Drive). Use parent_id to browse a folder; omit for root.",
    inputSchema: listFilesInputSchema,
    execute: (input) => executeListFiles(input, { user }),
  });
}
