import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeReadMicrosoftEmail } from "./execute";
import { readMicrosoftEmailInputSchema } from "./schema";

export function createReadMicrosoftEmailTool(user: UserContext) {
  return tool({
    description:
      "Read the full content of an Outlook message by message_id. Use search_microsoft_inbox first when the user references an email without an id.",
    inputSchema: readMicrosoftEmailInputSchema,
    execute: (input) => executeReadMicrosoftEmail(input, { user }),
  });
}
