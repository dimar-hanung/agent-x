import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeSearchDrive } from "./execute";
import { searchDriveInputSchema } from "./schema";

export function createSearchDriveTool(user: UserContext) {
  return tool({
    description:
      "Search files in the user's connected Google Drive by name. Returns file ids for read_drive_file.",
    inputSchema: searchDriveInputSchema,
    execute: (input) => executeSearchDrive(input, { user }),
  });
}
