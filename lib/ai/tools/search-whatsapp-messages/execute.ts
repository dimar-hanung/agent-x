import type { UserContext } from "@/lib/ai/roles/types";
import { searchAndAnalyzeWhatsAppMessages } from "@/lib/integrations/whatsapp-inbox/search/analyze";

import type { SearchWhatsappMessagesInput } from "./schema";
import type { SearchWhatsappMessagesToolResult } from "./types";

export async function executeSearchWhatsappMessages(
  input: SearchWhatsappMessagesInput,
  ctx: { user: UserContext; abortSignal?: AbortSignal }
): Promise<SearchWhatsappMessagesToolResult> {
  const since = input.since ? new Date(input.since) : undefined;

  const result = await searchAndAnalyzeWhatsAppMessages(ctx.user.userId, {
    query: input.query,
    chatQuery: input.chat_name_or_jid,
    since,
    abortSignal: ctx.abortSignal,
  });

  if (!result.success) {
    return {
      success: false,
      message: result.message,
    };
  }

  return {
    success: true,
    data: {
      query: result.query,
      analysisText: result.analysisText,
      results: result.results,
      attemptedKeywords: result.attemptedKeywords,
      successfulKeywords: result.successfulKeywords,
      chatCount: result.chatCount,
      chunkCount: result.chunkCount,
      messageCount: result.messageCount,
      chatFilter: result.chatFilter,
    },
  };
}
