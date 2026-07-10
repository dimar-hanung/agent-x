import type { ChatAgentRuntimeContext } from "@/lib/ai/agents/chat-agent";
import { buildTikTokApifyRequest } from "@/lib/ai/apify/input-mapping";
import { submitApifySnapshot } from "@/lib/ai/apify/submission";
import type { UserContext } from "@/lib/ai/roles/types";

import type { FetchTikTokDataInput } from "./schema";
import type { FetchTikTokDataToolResult } from "./types";

export interface FetchTikTokDataContext {
  user: UserContext;
  runtimeContext?: ChatAgentRuntimeContext;
}

export async function executeFetchTikTokData(
  input: FetchTikTokDataInput,
  ctx: FetchTikTokDataContext
): Promise<FetchTikTokDataToolResult> {
  try {
    const request = buildTikTokApifyRequest(input);

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
          : "Gagal menyiapkan pengambilan data TikTok.",
    };
  }
}