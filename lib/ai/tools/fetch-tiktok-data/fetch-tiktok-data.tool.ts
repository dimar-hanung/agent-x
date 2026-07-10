import { tool } from "ai";

import type { ChatAgentRuntimeContext } from "@/lib/ai/agents/chat-agent";
import type { UserContext } from "@/lib/ai/roles/types";

import { executeFetchTikTokData } from "./execute";
import { fetchTikTokDataInputSchema } from "./schema";

export function createFetchTikTokDataTool(
  user: UserContext,
  runtimeContext?: ChatAgentRuntimeContext
) {
  return tool({
    description:
      "Primary tool for TikTok social listening and platform data. Create or reuse an asynchronous social media data collection for TikTok hashtags, profiles, search queries, post URLs, trends, sentiment, and posts. Prefer this over Exa for TikTok-specific data. When the user gives multiple TikTok topics, pass them together as search_queries in one call instead of making separate calls. Completed exact matches reuse previously collected data; new requests notify the user later.",
    inputSchema: fetchTikTokDataInputSchema,
    execute: (input) => executeFetchTikTokData(input, { user, runtimeContext }),
  });
}