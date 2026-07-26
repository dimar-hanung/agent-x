import { getWhatsAppBackfillDays, getWhatsAppBackfillMaxChats, getWhatsAppBackfillMaxMessagesPerChat } from "@/lib/integrations/whatsapp-inbox/config";
import { getWhatsAppProvider } from "@/lib/integrations/whatsapp/factory";
import { getUserInstanceRow } from "@/lib/integrations/whatsapp-inbox/user-instance-repository";
import type { WhatsAppIngestMessage } from "@/lib/integrations/whatsapp/types";

import { ingestWhatsAppMessage } from "./service";

export async function backfillUserWhatsAppInbox(userId: string): Promise<void> {
  const row = await getUserInstanceRow(userId);

  if (row.status !== "connected") {
    return;
  }

  const provider = getWhatsAppProvider();
  const since = new Date(Date.now() - getWhatsAppBackfillDays() * 24 * 60 * 60 * 1000);
  const maxChats = getWhatsAppBackfillMaxChats();
  const maxMessages = getWhatsAppBackfillMaxMessagesPerChat();

  const chats = await provider.findChats(row.instanceName);
  const targetChats = chats
    .sort((a, b) => {
      const aTime = a.lastMessageAt?.getTime() ?? 0;
      const bTime = b.lastMessageAt?.getTime() ?? 0;
      return bTime - aTime;
    })
    .slice(0, maxChats);

  for (const chat of targetChats) {
    const messages = await provider.findMessages(row.instanceName, chat.remoteJid, {
      since,
      limit: maxMessages,
    });

    for (const stored of messages) {
      const ingestMessage: WhatsAppIngestMessage = {
        remoteJid: stored.remoteJid,
        chatType: stored.chatType,
        senderJid: stored.senderJid,
        senderName: stored.senderName,
        direction: stored.direction,
        text: stored.text,
        messageId: stored.waMessageId,
        sentAt: stored.sentAt,
        fromMe: stored.direction === "outbound",
        isGroup: stored.chatType === "group",
      };

      await ingestWhatsAppMessage({ userId, message: ingestMessage });
    }
  }
}
