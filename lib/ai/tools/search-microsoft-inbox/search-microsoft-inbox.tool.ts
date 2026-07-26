import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeSearchMicrosoftInbox } from "./execute";
import { searchMicrosoftInboxInputSchema } from "./schema";

export function createSearchMicrosoftInboxTool(user: UserContext) {
  return tool({
    description:
      "Search the user's connected Microsoft Outlook inbox. Returns message summaries with ids for use with read_microsoft_email.",
    inputSchema: searchMicrosoftInboxInputSchema,
    execute: (input) => executeSearchMicrosoftInbox(input, { user }),
  });
}
