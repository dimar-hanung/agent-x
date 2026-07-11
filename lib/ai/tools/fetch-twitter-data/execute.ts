import type { ChatAgentRuntimeContext } from "@/lib/ai/agents/chat-agent";
import { buildTwitterApifyRequest } from "@/lib/ai/apify/input-mapping";
import { submitApifySnapshot } from "@/lib/ai/apify/submission";
import type { UserContext } from "@/lib/ai/roles/types";

import type { FetchTwitterDataInput } from "./schema";
import type { FetchTwitterDataToolResult } from "./types";

export interface FetchTwitterDataContext {
  user: UserContext;
  runtimeContext?: ChatAgentRuntimeContext;
}

export async function executeFetchTwitterData(
  input: FetchTwitterDataInput,
  ctx: FetchTwitterDataContext
): Promise<FetchTwitterDataToolResult> {
  try {
    const request = buildTwitterApifyRequest(input);

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
          : "Gagal menyiapkan pengambilan data Twitter/X.",
    };
  }
}