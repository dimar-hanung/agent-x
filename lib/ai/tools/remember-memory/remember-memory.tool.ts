import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeRememberMemory } from "./execute";
import { rememberMemoryInputSchema } from "./schema";

export function createRememberMemoryTool(user: UserContext) {
  return tool({
    description:
      "Save a durable user preference to long-term memory (language, tone, timezone, recurring constraints). Do not use for one-off tasks or todos.",
    inputSchema: rememberMemoryInputSchema,
    execute: (input) => executeRememberMemory(input, { user }),
  });
}
