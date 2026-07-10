import type { ChatAgentRuntimeContext } from "@/lib/ai/agents/chat-agent";
import { buildThreadsApifyRequest } from "@/lib/ai/apify/input-mapping";
import { submitApifySnapshot } from "@/lib/ai/apify/submission";
import type { UserContext } from "@/lib/ai/roles/types";

import type { FetchThreadsDataInput } from "./schema";
import type { FetchThreadsDataToolResult } from "./types";

export interface FetchThreadsDataContext {
  user: UserContext;
  runtimeContext?: ChatAgentRuntimeContext;
}

export async function executeFetchThreadsData(
  input: FetchThreadsDataInput,
  ctx: FetchThreadsDataContext
): Promise<FetchThreadsDataToolResult> {
  try {
    const request = buildThreadsApifyRequest(input);

    return submitApifySnapshot({
      user: ctx.user,
      runtimeContext: ctx.runtimeContext,
      request,
      forceRefresh: input.force_refresh,
    });
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal menyiapkan pengambilan data Threads.",
    };
  }
}