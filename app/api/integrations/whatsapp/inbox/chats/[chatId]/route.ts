import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import {
  getRecentMessagesForChat,
  getWhatsAppChatForUser,
} from "@/lib/integrations/whatsapp-inbox/ingest/service";
import { getLatestChatSummary } from "@/lib/integrations/whatsapp-inbox/summary/service";

function requireClientOrAdmin(role: string) {
  return role === "client" || role === "admin";
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ chatId: string }> }
) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (!requireClientOrAdmin(user.role)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const { chatId } = await context.params;
  const chat = await getWhatsAppChatForUser(user.userId, chatId);

  if (!chat) {
    return NextResponse.json({ message: "Chat tidak ditemukan." }, { status: 404 });
  }

  const [summary, recentMessages] = await Promise.all([
    getLatestChatSummary(user.userId, chatId),
    getRecentMessagesForChat(user.userId, chatId, 10),
  ]);

  return NextResponse.json({
    chat: {
      id: chat.id,
      displayName: chat.displayName,
      chatType: chat.chatType,
      remoteJid: chat.remoteJid,
      lastMessageAt: chat.lastMessageAt?.toISOString() ?? null,
    },
    summary: summary
      ? {
          summaryText: summary.summaryText,
          highlights: summary.highlights,
          coversFrom: summary.coversFrom.toISOString(),
          coversTo: summary.coversTo.toISOString(),
          messageCount: summary.messageCount,
          generatedAt: summary.generatedAt.toISOString(),
        }
      : null,
    recentMessages: recentMessages
      .reverse()
      .map((message) => ({
        id: message.id,
        senderName: message.senderName,
        direction: message.direction,
        text: message.text,
        sentAt: message.sentAt.toISOString(),
      })),
  });
}
