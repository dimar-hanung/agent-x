import { generateId, type UIMessage } from "ai";

import { getOrCreateMainChannel } from "@/lib/db/repositories/channel-repository";
import {
  loadStoredChatMessages,
  saveChat,
} from "@/lib/db/repositories/chat-repository";
import type {
  ApifySocialPlatform,
  ApifySocialSnapshot,
} from "@/lib/db/schema";
import { sendWhatsAppToUser } from "@/lib/integrations/whatsapp-channel-repository";

import { generateApifySnapshotAnalysis } from "./analysis";
import { platformLabel } from "./preview";

function formatFailedText(snapshot: ApifySocialSnapshot): string {
  const platform = platformLabel(snapshot.platform as ApifySocialPlatform);

  return [
    `Maaf, analisis ${platform} belum berhasil disiapkan.`,
    "",
    "Silakan coba lagi nanti atau sederhanakan topik pencariannya.",
  ].join("\n");
}

async function buildNotificationText(
  snapshot: ApifySocialSnapshot
): Promise<string> {
  if (snapshot.status === "completed") {
    return generateApifySnapshotAnalysis(snapshot);
  }

  return formatFailedText(snapshot);
}

export async function notifyApifySnapshot(
  snapshot: ApifySocialSnapshot
): Promise<void> {
  const chatId = await getOrCreateMainChannel(snapshot.userId);
  const previousMessages = await loadStoredChatMessages(chatId, snapshot.userId);
  const text = await buildNotificationText(snapshot);

  const assistantMessage: UIMessage = {
    id: generateId(),
    role: "assistant",
    parts: [{ type: "text", text }],
    metadata: {
      source: "apify",
      snapshotId: snapshot.id,
      platform: snapshot.platform,
    },
  };

  await saveChat({
    chatId,
    userId: snapshot.userId,
    allMessages: [
      ...previousMessages.map(({ sequence: _sequence, ...message }) => message),
      assistantMessage,
    ],
  });

  void sendWhatsAppToUser(snapshot.userId, text).catch((error) => {
    console.error("Kirim notifikasi Apify via WhatsApp gagal:", error);
  });
}