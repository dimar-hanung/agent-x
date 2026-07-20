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
import {
  sendWhatsAppMediaToUser,
  sendWhatsAppToUser,
} from "@/lib/integrations/whatsapp-channel-repository";

import { generateApifySnapshotAnalysis } from "./analysis";
import {
  buildPreviewItems,
  getSnapshotItems,
  platformLabel,
} from "./preview";
import { buildSocialMediaCard } from "./social-card";
import type { ApifyPreviewItem } from "./types";

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

async function sendWhatsAppSnapshot(
  snapshot: ApifySocialSnapshot,
  text: string,
  previews: ApifyPreviewItem[]
): Promise<void> {
  const platform = snapshot.platform as ApifySocialPlatform;
  const card = buildSocialMediaCard(platform, previews);

  if (card) {
    try {
      await sendWhatsAppMediaToUser(snapshot.userId, card);
    } catch (error) {
      console.error("Kirim kartu media sosial via WhatsApp gagal:", error);
    }
  }

  await sendWhatsAppToUser(
    snapshot.userId,
    text,
    card ? { linkPreview: false } : undefined
  );
}

export async function notifyApifySnapshot(
  snapshot: ApifySocialSnapshot
): Promise<void> {
  const chatId = await getOrCreateMainChannel(snapshot.userId);
  const previousMessages = await loadStoredChatMessages(chatId, snapshot.userId);
  const text = await buildNotificationText(snapshot);
  const previews =
    snapshot.status === "completed"
      ? buildPreviewItems(
          snapshot.platform as ApifySocialPlatform,
          getSnapshotItems(snapshot),
          3
        )
      : [];

  const assistantMessage: UIMessage = {
    id: generateId(),
    role: "assistant",
    parts: [{ type: "text", text }],
    metadata: {
      source: "apify",
      snapshotId: snapshot.id,
      platform: snapshot.platform,
      socialPreviews: previews,
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

  void sendWhatsAppSnapshot(snapshot, text, previews).catch((error) => {
    console.error("Kirim notifikasi Apify via WhatsApp gagal:", error);
  });
}
