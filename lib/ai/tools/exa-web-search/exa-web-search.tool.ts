import { tool } from "ai";

import { executeExaWebSearch } from "./execute";
import { exaWebSearchInputSchema } from "./schema";

export function createExaWebSearchTool() {
  return tool({
    description:
      "Search the web for current information via Exa. Use for news, facts, documentation, and anything that may be outdated in training data.",
    inputSchema: exaWebSearchInputSchema,
    execute: executeExaWebSearch,
  });
}
