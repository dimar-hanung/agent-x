import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeSearchInbox } from "./execute";
import { searchInboxInputSchema } from "./schema";

export function createSearchInboxTool(user: UserContext) {
  return tool({
    description:
      "Search the user's Gmail inbox. Returns message summaries with UIDs for use with read_email.",
    inputSchema: searchInboxInputSchema,
    execute: (input) => executeSearchInbox(input, { user }),
  });
}
