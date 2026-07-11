import { tool } from "ai";

import type { ChatAgentRuntimeContext } from "@/lib/ai/agents/chat-agent";
import type { UserContext } from "@/lib/ai/roles/types";

import { executeFetchThreadsData } from "./execute";
import { fetchThreadsDataInputSchema } from "./schema";

export function createFetchThreadsDataTool(
  user: UserContext,
  runtimeContext?: ChatAgentRuntimeContext
) {
  return tool({
    description:
      "Primary tool for Threads social listening and platform data. Create or reuse one asynchronous social media data collection for Threads keyword, hashtag, date, sorting, user, cursor, trends, sentiment, and posts. Prefer this over Exa for Threads-specific data. When the user gives multiple Threads topics, pass them together as search_queries in one call instead of making separate calls. Completed exact matches reuse previously collected data; new requests notify the user later.",
    inputSchema: fetchThreadsDataInputSchema,
    execute: (input) => executeFetchThreadsData(input, { user, runtimeContext }),
  });
}