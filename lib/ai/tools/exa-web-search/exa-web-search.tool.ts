import { tool } from "ai";

import { executeExaWebSearch } from "./execute";
import { exaWebSearchInputSchema } from "./schema";

export function createExaWebSearchTool() {
  return tool({
    description:
      "Search the web for current information via Exa. Use for news, facts, documentation, and broader web context. Do not use as the primary tool for TikTok, Twitter/X, or Threads posts, comments, sentiment, trends, hashtags, or social listening; use the Apify social tools first for those.",
    inputSchema: exaWebSearchInputSchema,
    execute: executeExaWebSearch,
  });
}
