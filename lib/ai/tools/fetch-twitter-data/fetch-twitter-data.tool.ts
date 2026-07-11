import { tool } from "ai";

import type { ChatAgentRuntimeContext } from "@/lib/ai/agents/chat-agent";
import type { UserContext } from "@/lib/ai/roles/types";

import { executeFetchTwitterData } from "./execute";
import { fetchTwitterDataInputSchema } from "./schema";

export function createFetchTwitterDataTool(
  user: UserContext,
  runtimeContext?: ChatAgentRuntimeContext
) {
  return tool({
    description:
      "Primary tool for Twitter/X social listening and platform data. Create or reuse an asynchronous social media data collection for X/Twitter URLs, advanced searches, handles, conversations, filters, trends, sentiment, and posts. Prefer this over Exa for Twitter/X-specific data. When the user gives multiple Twitter/X topics, pass them together as search_terms in one call instead of making separate calls. Completed exact matches reuse previously collected data; new requests notify the user later.",
    inputSchema: fetchTwitterDataInputSchema,
    execute: (input) => executeFetchTwitterData(input, { user, runtimeContext }),
  });
}