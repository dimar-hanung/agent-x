import type { UserContext } from "@/lib/ai/roles/types";
import { listChatsWithSummaryFlag } from "@/lib/integrations/whatsapp-inbox/summary/service";
import { getUserInstance } from "@/lib/integrations/whatsapp-inbox/user-instance-repository";

import type { ListWhatsappChatsInput } from "./schema";
import type { ListWhatsappChatsToolResult } from "./types";

export async function executeListWhatsappChats(
  _input: ListWhatsappChatsInput,
  ctx: { user: UserContext }
): Promise<ListWhatsappChatsToolResult> {
  const instance = await getUserInstance(ctx.user.userId);

  if (instance.status !== "connected") {
    return {
      success: false,
      message:
        "WhatsApp pribadi belum terhubung. Hubungkan di Settings → Integrations.",
    };
  }

  const chats = await listChatsWithSummaryFlag(ctx.user.userId);

  return {
    success: true,
    data: {
      connected: true,
      chats: chats.map((chat) => ({
        id: chat.id,
        displayName: chat.displayName,
        chatType: chat.chatType,
        lastMessageAt: chat.lastMessageAt,
        hasSummary: chat.hasSummary,
      })),
    },
  };
}
