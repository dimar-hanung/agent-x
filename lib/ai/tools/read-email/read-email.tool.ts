import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeReadEmail } from "./execute";
import { readEmailInputSchema } from "./schema";

export function createReadEmailTool(user: UserContext) {
  return tool({
    description:
      "Read the full content of a Gmail message by UID. Use search_inbox first when the user references an email without a UID.",
    inputSchema: readEmailInputSchema,
    execute: (input) => executeReadEmail(input, { user }),
  });
}
