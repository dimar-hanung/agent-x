import type { UserContext } from "@/lib/ai/roles/types";
import { generateChatSummaryByQuery } from "@/lib/integrations/whatsapp-inbox/summary/service";

import type { SummarizeWhatsappChatInput } from "./schema";
import type { SummarizeWhatsappChatToolResult } from "./types";

export async function executeSummarizeWhatsappChat(
  input: SummarizeWhatsappChatInput,
  ctx: { user: UserContext }
): Promise<SummarizeWhatsappChatToolResult> {
  const since = input.since ? new Date(input.since) : undefined;
  const result = await generateChatSummaryByQuery(
    ctx.user.userId,
    input.chat_name_or_jid,
    { since }
  );

  if ("success" in result && result.success === false) {
    return { success: false, message: result.message };
  }

  if ("success" in result) {
    return { success: false, message: "Gagal merangkum chat." };
  }

  return {
    success: true,
    data: result,
  };
}
