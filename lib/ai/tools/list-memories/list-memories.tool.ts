import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeListMemories } from "./execute";
import { listMemoriesInputSchema } from "./schema";

export function createListMemoriesTool(user: UserContext) {
  return tool({
    description:
      "List all durable user preferences stored in long-term memory (id, content, source).",
    inputSchema: listMemoriesInputSchema,
    execute: (input) => executeListMemories(input, { user }),
  });
}
