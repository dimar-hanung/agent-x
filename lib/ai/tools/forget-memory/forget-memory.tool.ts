import { tool } from "ai";

import type { UserContext } from "@/lib/ai/roles/types";

import { executeForgetMemory } from "./execute";
import { forgetMemoryInputSchema } from "./schema";

export function createForgetMemoryTool(user: UserContext) {
  return tool({
    description:
      "Permanently delete a stored user preference by memory UUID. Use list_memories first if the id is unknown.",
    inputSchema: forgetMemoryInputSchema,
    execute: (input) => executeForgetMemory(input, { user }),
  });
}
