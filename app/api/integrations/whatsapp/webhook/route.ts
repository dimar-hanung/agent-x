import { NextResponse } from "next/server";

import { processChannelMessage } from "@/lib/channel/process-channel-message";
import {
  getChannelConfig,
  resolveUserIdByPhone,
} from "@/lib/integrations/whatsapp-channel-repository";
import { getWhatsAppProvider } from "@/lib/integrations/whatsapp/factory";
import type { WhatsAppWebhookPayload } from "@/lib/integrations/whatsapp/types";

const UNREGISTERED_REPLY =
  "Nomor belum terdaftar. Daftarkan nomor HP kamu di AgentX → Settings → Integrations.";

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

  const inbound = provider.parseInboundMessage(payload);

  if (!inbound) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const config = await getChannelConfig();

  if (config.status !== "connected") {
    return NextResponse.json({ ok: true, ignored: true });
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
    await processChannelMessage({
      userId,
      text: inbound.text,
      source: "whatsapp",
      replyViaWhatsApp: true,
      metadata: { messageId: inbound.messageId },
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
