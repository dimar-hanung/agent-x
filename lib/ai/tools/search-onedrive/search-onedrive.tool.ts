import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeSearchOnedrive } from "./execute";
import { searchOnedriveInputSchema } from "./schema";

export function createSearchOnedriveTool(user: UserContext) {
  return tool({
    description:
      "Search files in the user's connected Microsoft OneDrive by name. Returns file ids for read_onedrive_file.",
    inputSchema: searchOnedriveInputSchema,
    execute: (input) => executeSearchOnedrive(input, { user }),
  });
}
