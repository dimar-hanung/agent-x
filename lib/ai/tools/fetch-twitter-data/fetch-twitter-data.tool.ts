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
      "Primary tool for Twitter/X social listening and advanced search. Search by query or structured engagement, media, user, content, tweet, time, geo, app, and card filters. Prefer this over Exa for Twitter/X-specific posts, trends, and sentiment. When the user gives multiple topics, pass them together as search_terms in one call; they are combined into one OR query. Set latest=true for latest, recent, newest, current, or baru-baru ini topics. Results always use Top sorting. Only set content_language when the user explicitly requests a source language; use 'in' for Indonesian. Completed exact matches reuse previously collected data; new requests notify the user later.",
    inputSchema: fetchTwitterDataInputSchema,
    execute: (input) => executeFetchTwitterData(input, { user, runtimeContext }),
  });
}
