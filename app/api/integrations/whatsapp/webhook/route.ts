import { NextResponse } from "next/server";

import { isVisionModelEnabled } from "@/lib/admin/model-settings/constants";
import { getModelSettings } from "@/lib/admin/model-settings/repository";
import {
  getVoiceConfig,
  transcribeAudio,
  type VoiceConfig,
} from "@/lib/ai/voice";
import { enqueueWhatsAppBotJob } from "@/lib/integrations/whatsapp/bot-queue/job-repository";
import {
  getChannelConfig,
  getUserWhatsAppPhone,
  resolveUserIdByPhone,
} from "@/lib/integrations/whatsapp-channel-repository";
import {
  findPersonalOutboundToGlobalBot,
  personalOutboundToChannelInbound,
} from "@/lib/integrations/whatsapp/personal-bot-bridge";
import { isAgentGeneratedWhatsAppText } from "@/lib/integrations/whatsapp/bot-echo-filter";
import { enqueueWhatsAppInboxEvents } from "@/lib/integrations/whatsapp-inbox/ingest/event-repository";
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
} from "@/lib/integrations/whatsapp/webhook-dedup";
import { getWhatsAppProvider } from "@/lib/integrations/whatsapp/factory";
import type { WhatsAppProvider } from "@/lib/integrations/whatsapp/provider";
import type {
  WhatsAppDownloadedMedia,
  WhatsAppInboundAttachmentMeta,
  WhatsAppInboundMessage,
  WhatsAppSavedAttachment,
  WhatsAppWebhookPayload,
} from "@/lib/integrations/whatsapp/types";
import { isSeaweedfsConfigured } from "@/lib/files/s3-client";

const UNREGISTERED_REPLY =
  "Nomor belum terdaftar. Daftarkan nomor HP kamu di AgentX → Settings → Integrations.";

const VOICE_TRANSCRIPTION_FAILED_REPLY =
  "Gagal memahami pesan suara. Coba kirim ulang dengan suara yang lebih jelas.";

/** Durable enqueue needs a stable key; real WhatsApp messages always carry key.id. */
function resolveBotJobMessageId(
  messageId: string | undefined,
  senderPhoneE164: string
): string {
  const trimmed = messageId?.trim();
  return trimmed && trimmed.length > 0
    ? trimmed
    : `${senderPhoneE164}-${Date.now()}`;
}

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

interface DownloadedInboundAttachment {
  meta: WhatsAppInboundAttachmentMeta;
  media: WhatsAppDownloadedMedia;
}

async function downloadInboundAttachments(
  provider: WhatsAppProvider,
  instanceName: string,
  inbound: WhatsAppInboundMessage
): Promise<DownloadedInboundAttachment[] | null> {
  const attachments = inbound.attachments ?? [];
  const downloaded: DownloadedInboundAttachment[] = [];

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

async function transcribeVoiceAttachments(
  downloaded: DownloadedInboundAttachment[],
  voiceConfig: VoiceConfig
): Promise<string[]> {
  const voiceItems = downloaded.filter(
    (item) => item.meta.mediaType === "audio"
  );
  const transcripts: string[] = [];

  for (const item of voiceItems) {
    transcripts.push(
      await transcribeAudio(
        {
          base64: item.media.base64,
          mimeType: item.media.mimeType || item.meta.mimeType,
          fileName: item.meta.fileName,
          byteLength: item.media.buffer.length,
        },
        voiceConfig
      )
    );
  }

  return transcripts;
}

function combineInboundText(
  originalText: string,
  transcripts: string[]
): string {
  return [originalText.trim(), ...transcripts]
    .filter((value) => value.length > 0)
    .join("\n\n");
}

function getVoiceInputRejection(
  inbound: WhatsAppInboundMessage,
  voiceConfig: VoiceConfig
): string | null {
  const voiceAttachments =
    inbound.attachments?.filter(
      (attachment) => attachment.mediaType === "audio"
    ) ?? [];

  if (voiceAttachments.length === 0) {
    return null;
  }

  if (!voiceConfig.inputEnabled) {
    return "Fitur pesan suara belum diaktifkan.";
  }

  if (
    voiceAttachments.some(
      (attachment) => attachment.ptt === false
    )
  ) {
    return "Kirim rekaman sebagai pesan suara WhatsApp, bukan file audio.";
  }

  if (
    voiceAttachments.some(
      (attachment) =>
        typeof attachment.durationSeconds === "number" &&
        attachment.durationSeconds > voiceConfig.inputMaxSeconds
    )
  ) {
    return (
      "Pesan suara terlalu panjang. Kirim maksimal " +
      voiceConfig.inputMaxSeconds +
      " detik."
    );
  }

  return null;
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

  if (personalUserId && instanceName) {
    const messages =
      parsed.messages && parsed.messages.length > 0
        ? parsed.messages
        : parsed.message
          ? [parsed.message]
          : [];
    const queued = await enqueueWhatsAppInboxEvents({
      userId: personalUserId,
      instanceName,
      messages,
    });

    const botOutbound = findPersonalOutboundToGlobalBot(
      messages,
      config.channelPhoneE164
    );

    if (botOutbound && config.status === "connected") {
      const registeredPhone = await getUserWhatsAppPhone(personalUserId);

      if (registeredPhone) {
        const bridgedInbound = personalOutboundToChannelInbound(
          botOutbound,
          registeredPhone
        );

        if (isAgentGeneratedWhatsAppText(bridgedInbound.text)) {
          return NextResponse.json({
            ok: true,
            queued,
            duplicates: messages.length - queued,
            total: messages.length,
            ignoredBotEcho: true,
          });
        }

        const bridgedDedupeText =
          bridgedInbound.text ||
          bridgedInbound.attachments
            ?.map(
              (item) =>
                item.mediaType + ":" + item.messageKey.id
            )
            .join("|") ||
          "";

        if (
          !isDuplicateWhatsAppInboundMessage(bridgedInbound.messageId) &&
          !isDuplicateWhatsAppInboundContent(
            bridgedInbound.senderPhoneE164,
            bridgedDedupeText
          )
        ) {
          try {
            const voiceInput = Boolean(
              bridgedInbound.attachments?.some(
                (item) => item.mediaType === "audio"
              )
            );
            let bridgedText = bridgedInbound.text;
            let requestModelSettings:
              | Awaited<ReturnType<typeof getModelSettings>>
              | undefined;

            if (voiceInput) {
              requestModelSettings = await getModelSettings();
              const voiceConfig = getVoiceConfig(requestModelSettings);
              const voiceRejection = getVoiceInputRejection(
                bridgedInbound,
                voiceConfig
              );

              if (voiceRejection) {
                await provider.sendText(
                  config.instanceName,
                  registeredPhone,
                  voiceRejection
                );
                return NextResponse.json({
                  ok: true,
                  queued,
                  voiceRejected: true,
                });
              }

              const downloaded = await downloadInboundAttachments(
                provider,
                instanceName,
                bridgedInbound
              );

              if (!downloaded) {
                throw new Error("Gagal mengunduh pesan suara WhatsApp.");
              }

              bridgedText = combineInboundText(
                bridgedText,
                await transcribeVoiceAttachments(downloaded, voiceConfig)
              );
            }

            void signalProcessingState(
              provider,
              config.instanceName,
              bridgedInbound
            ).catch((error) => {
              console.error("WhatsApp read/typing signal gagal:", error);
            });

            await enqueueWhatsAppBotJob({
              userId: personalUserId,
              waMessageId: resolveBotJobMessageId(
                bridgedInbound.messageId,
                bridgedInbound.senderPhoneE164
              ),
              text: bridgedText,
              inputMode: voiceInput ? "voice" : "text",
            });
          } catch (error) {
            console.error("WhatsApp personal bot bridge error:", error);

            await provider.sendText(
              config.instanceName,
              registeredPhone,
              "Terjadi kesalahan saat memproses pesan. Coba lagi nanti."
            );
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      queued,
      duplicates: messages.length - queued,
      total: messages.length,
    });
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

  if (isAgentGeneratedWhatsAppText(inbound.text)) {
    return NextResponse.json({ ok: true, ignored: true, botEcho: true });
  }

  if (isDuplicateWhatsAppInboundMessage(inbound.messageId)) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  const dedupeText =
    inbound.text ||
    inbound.attachments
      ?.map((item) => item.mediaType + ":" + item.messageKey.id)
      .join("|") ||
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
  const voiceConfig = getVoiceConfig(modelSettings);
  const hasAttachments = Boolean(inbound.attachments?.length);

  if (hasAttachments) {
    const voiceRejection = getVoiceInputRejection(inbound, voiceConfig);

    if (voiceRejection) {
      await provider.sendText(
        config.instanceName,
        inbound.senderPhoneE164,
        voiceRejection
      );
      return NextResponse.json({
        ok: true,
        voiceRejected: true,
      });
    }

    const needsFileStorage = Boolean(
      inbound.attachments?.some(
        (attachment) => attachment.mediaType !== "audio"
      )
    );

    if (needsFileStorage && !isSeaweedfsConfigured()) {
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

    const voiceInput = downloaded.some(
      (item) => item.meta.mediaType === "audio"
    );
    let agentText = inbound.text;

    if (voiceInput) {
      try {
        agentText = combineInboundText(
          agentText,
          await transcribeVoiceAttachments(downloaded, voiceConfig)
        );
      } catch (error) {
        console.error("WhatsApp voice transcription error:", error);
        await provider.sendText(
          config.instanceName,
          inbound.senderPhoneE164,
          VOICE_TRANSCRIPTION_FAILED_REPLY
        );
        return NextResponse.json({
          ok: true,
          voiceTranscriptionFailed: true,
        });
      }
    }

    const downloadedFiles = downloaded.filter(
      (item) => item.meta.mediaType !== "audio"
    );
    let savedAttachments: WhatsAppSavedAttachment[] = [];

    if (downloadedFiles.length > 0) {
      try {
        savedAttachments = await saveInboundWhatsAppAttachments(
          userId,
          inbound,
          downloadedFiles
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
    }

    const visionRequired = inboundRequiresVisionModel(savedAttachments);
    const visionOnly = inboundHasVisionOnlyAttachments(
      savedAttachments,
      agentText
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

      await enqueueWhatsAppBotJob({
        userId,
        waMessageId: resolveBotJobMessageId(
          inbound.messageId,
          inbound.senderPhoneE164
        ),
        text: agentText,
        attachments: savedAttachments,
        inputMode: voiceInput ? "voice" : "text",
      });
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

    await enqueueWhatsAppBotJob({
      userId,
      waMessageId: resolveBotJobMessageId(
        inbound.messageId,
        inbound.senderPhoneE164
      ),
      text: inbound.text,
    });
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
