import { NextResponse } from "next/server";

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

  if (
    isDuplicateWhatsAppInboundContent(
      inbound.senderPhoneE164,
      inbound.text
    )
  ) {
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
