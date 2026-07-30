import { NextResponse } from "next/server";

import { isVisionModelEnabled } from "@/lib/admin/model-settings/constants";
import { getModelSettings } from "@/lib/admin/model-settings/repository";
import { processChannelMessage } from "@/lib/channel/process-channel-message";
import {
  getChannelConfig,
  resolveUserIdByPhone,
} from "@/lib/integrations/whatsapp-channel-repository";
import { ingestWhatsAppMessage } from "@/lib/integrations/whatsapp-inbox/ingest/service";
import {
  isUserInstanceName,
  resolveUserIdByInstanceName,
} from "@/lib/integrations/whatsapp-inbox/user-instance-repository";
import {
  inboundHasVisionOnlyAttachments,
  inboundRequiresVisionModel,
  saveInboundWhatsAppAttachments,
  WA_MEDIA_DOWNLOAD_FAILED_REPLY,
  WA_STORAGE_NOT_CONFIGURED_REPLY,
  WA_VISION_DISABLED_REPLY,
} from "@/lib/integrations/whatsapp/save-inbound-media";
import {
  isDuplicateWhatsAppInboundContent,
  isDuplicateWhatsAppInboundMessage,
  withWhatsAppUserProcessingLock,
} from "@/lib/integrations/whatsapp/webhook-dedup";
import { getWhatsAppProvider } from "@/lib/integrations/whatsapp/factory";
import type { WhatsAppProvider } from "@/lib/integrations/whatsapp/provider";
import type {
  WhatsAppInboundMessage,
  WhatsAppWebhookPayload,
} from "@/lib/integrations/whatsapp/types";
import { isSeaweedfsConfigured } from "@/lib/files/s3-client";

const UNREGISTERED_REPLY =
  "Nomor belum terdaftar. Daftarkan nomor HP kamu di AgentX → Settings → Integrations.";

/** Best-effort read receipt + typing while the AI processes the inbound message. */
async function signalProcessingState(
  provider: WhatsAppProvider,
  instanceName: string,
  inbound: WhatsAppInboundMessage
): Promise<void> {
  const tasks: Promise<void>[] = [
    provider
      .sendPresence(instanceName, inbound.senderPhoneE164, "composing")
      .catch((error) => {
        console.error("WhatsApp typing signal gagal:", error);
      }),
  ];

  if (inbound.messageId && inbound.remoteJid) {
    tasks.push(
      provider
        .markAsRead(instanceName, [
          {
            remoteJid: inbound.remoteJid,
            fromMe: false,
            id: inbound.messageId,
          },
        ])
        .catch((error) => {
          console.error("WhatsApp read signal gagal:", error);
        })
    );
  }

  await Promise.all(tasks);
}

async function downloadInboundAttachments(
  provider: WhatsAppProvider,
  instanceName: string,
  inbound: WhatsAppInboundMessage
) {
  const attachments = inbound.attachments ?? [];
  const downloaded = [];

  for (const meta of attachments) {
    const media = await provider.downloadMediaMessage(
      instanceName,
      meta.messageKey
    );

    if (!media) {
      return null;
    }

    downloaded.push({ meta, media });
  }

  return downloaded;
}

export async function POST(req: Request) {
  const provider = getWhatsAppProvider();
  const verified = await provider.verifyWebhook(req);

  if (!verified) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  let payload: WhatsAppWebhookPayload;

  try {
    payload = (await req.json()) as WhatsAppWebhookPayload;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = provider.parseInboundMessageForInstance(payload);
  const instanceName = parsed.instanceName;
  const config = await getChannelConfig();

  const personalUserId =
    instanceName && instanceName !== config.instanceName
      ? await resolveUserIdByInstanceName(instanceName)
      : null;

  if (personalUserId) {
    const messages =
      parsed.messages && parsed.messages.length > 0
        ? parsed.messages
        : parsed.message
          ? [parsed.message]
          : [];

    let ingested = 0;
    for (const message of messages) {
      const saved = await ingestWhatsAppMessage({
        userId: personalUserId,
        message,
      });
      if (saved) {
        ingested += 1;
      }
    }

    return NextResponse.json({ ok: true, ingested, total: messages.length });
  }

  // Only the currently paired global channel may auto-reply. Personal inboxes
  // and stale instances stay silent so contacts never get a bot message.
  if (
    instanceName &&
    (instanceName !== config.instanceName || isUserInstanceName(instanceName))
  ) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (config.status !== "connected") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const inbound = provider.parseInboundMessage(payload);

  if (!inbound) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (isDuplicateWhatsAppInboundMessage(inbound.messageId)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const dedupeText =
    inbound.text ||
    inbound.attachments?.map((item) => item.fileName).join("|") ||
    "";

  if (isDuplicateWhatsAppInboundContent(inbound.senderPhoneE164, dedupeText)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const userId = await resolveUserIdByPhone(inbound.senderPhoneE164);

  if (!userId) {
    await provider.sendText(
      config.instanceName,
      inbound.senderPhoneE164,
      UNREGISTERED_REPLY
    );
    return NextResponse.json({ ok: true, unregistered: true });
  }

  const modelSettings = await getModelSettings();
  const hasAttachments = Boolean(inbound.attachments?.length);

  if (hasAttachments) {
    if (!isSeaweedfsConfigured()) {
      await provider.sendText(
        config.instanceName,
        inbound.senderPhoneE164,
        WA_STORAGE_NOT_CONFIGURED_REPLY
      );
      return NextResponse.json({ ok: true, storageUnavailable: true });
    }

    const downloaded = await downloadInboundAttachments(
      provider,
      config.instanceName,
      inbound
    );

    if (!downloaded) {
      await provider.sendText(
        config.instanceName,
        inbound.senderPhoneE164,
        WA_MEDIA_DOWNLOAD_FAILED_REPLY
      );
      return NextResponse.json({ ok: true, mediaDownloadFailed: true });
    }

    let savedAttachments;
    try {
      savedAttachments = await saveInboundWhatsAppAttachments(
        userId,
        inbound,
        downloaded
      );
    } catch (error) {
      console.error("WhatsApp save attachment error:", error);
      await provider.sendText(
        config.instanceName,
        inbound.senderPhoneE164,
        WA_STORAGE_NOT_CONFIGURED_REPLY
      );
      return NextResponse.json({ ok: true, storageUnavailable: true });
    }

    const visionRequired = inboundRequiresVisionModel(savedAttachments);
    const visionOnly = inboundHasVisionOnlyAttachments(
      savedAttachments,
      inbound.text
    );

    if (
      visionRequired &&
      !isVisionModelEnabled(modelSettings.visionModelId)
    ) {
      await provider.sendText(
        config.instanceName,
        inbound.senderPhoneE164,
        WA_VISION_DISABLED_REPLY
      );
      return NextResponse.json({ ok: true, visionDisabled: true });
    }

    if (visionOnly && !isVisionModelEnabled(modelSettings.visionModelId)) {
      await provider.sendText(
        config.instanceName,
        inbound.senderPhoneE164,
        WA_VISION_DISABLED_REPLY
      );
      return NextResponse.json({ ok: true, visionDisabled: true });
    }

    try {
      void signalProcessingState(
        provider,
        config.instanceName,
        inbound
      ).catch((error) => {
        console.error("WhatsApp read/typing signal gagal:", error);
      });

      await withWhatsAppUserProcessingLock(userId, (signal) =>
        processChannelMessage({
          userId,
          text: inbound.text,
          attachments: savedAttachments,
          source: "whatsapp",
          replyViaWhatsApp: true,
          abortSignal: signal,
          metadata: { messageId: inbound.messageId },
        })
      );
    } catch (error) {
      console.error("WhatsApp webhook process error:", error);

      await provider.sendText(
        config.instanceName,
        inbound.senderPhoneE164,
        "Terjadi kesalahan saat memproses pesan. Coba lagi nanti."
      );
    }

    return NextResponse.json({ ok: true });
  }

  try {
    void signalProcessingState(
      provider,
      config.instanceName,
      inbound
    ).catch((error) => {
      console.error("WhatsApp read/typing signal gagal:", error);
    });

    await withWhatsAppUserProcessingLock(userId, (signal) =>
      processChannelMessage({
        userId,
        text: inbound.text,
        source: "whatsapp",
        replyViaWhatsApp: true,
        abortSignal: signal,
        metadata: { messageId: inbound.messageId },
      })
    );
  } catch (error) {
    console.error("WhatsApp webhook process error:", error);

    await provider.sendText(
      config.instanceName,
      inbound.senderPhoneE164,
      "Terjadi kesalahan saat memproses pesan. Coba lagi nanti."
    );
  }

  return NextResponse.json({ ok: true });
}
