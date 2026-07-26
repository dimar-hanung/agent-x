import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeReadOnedriveFile } from "./execute";
import { readOnedriveFileInputSchema } from "./schema";

export function createReadOnedriveFileTool(user: UserContext) {
  return tool({
    description:
      "Read the content of a OneDrive file by file_id. Use search_onedrive first when the user references a file without an id.",
    inputSchema: readOnedriveFileInputSchema,
    execute: (input) => executeReadOnedriveFile(input, { user }),
  });
}
