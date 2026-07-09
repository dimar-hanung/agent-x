import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeReadDriveFile } from "./execute";
import { readDriveFileInputSchema } from "./schema";

export function createReadDriveFileTool(user: UserContext) {
  return tool({
    description:
      "Read content from a Google Drive file by id. Exports Docs/Sheets/Slides to text; binary files return metadata only.",
    inputSchema: readDriveFileInputSchema,
    execute: (input) => executeReadDriveFile(input, { user }),
  });
}
