import { tool } from "ai";

import { executeExaWebFetch } from "./execute";
import { exaWebFetchInputSchema } from "./schema";

export function createExaWebFetchTool() {
  return tool({
    description:
      "Fetch full webpage content as markdown via Exa. Use when the user provides a URL or search highlights are insufficient.",
    inputSchema: exaWebFetchInputSchema,
    execute: executeExaWebFetch,
  });
}
