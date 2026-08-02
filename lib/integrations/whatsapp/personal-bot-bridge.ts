import type {
  WhatsAppInboundMessage,
  WhatsAppIngestMessage,
} from "@/lib/integrations/whatsapp/types";

function jidDigits(remoteJid: string): string {
  return remoteJid.replace(/@.*$/, "").replace(/\D/g, "");
}

function phoneDigits(phoneE164: string): string {
  return phoneE164.replace(/\D/g, "");
}

export function jidMatchesPhoneE164(
  remoteJid: string,
  phoneE164: string | null | undefined
): boolean {
  if (!phoneE164) {
    return false;
  }

  const jid = jidDigits(remoteJid);
  const phone = phoneDigits(phoneE164);

  return Boolean(jid && phone && jid === phone);
}

/**
 * When a user has a personal inbox connected, outbound DMs to the global bot
 * number arrive on the personal Evolution instance (fromMe=true). The global
 * channel instance often only gets metadata events, so auto-reply must bridge
 * from the personal webhook.
 */
export function findPersonalOutboundToGlobalBot(
  messages: WhatsAppIngestMessage[],
  channelPhoneE164: string | null | undefined
): WhatsAppIngestMessage | null {
  if (!channelPhoneE164) {
    return null;
  }

  for (const message of messages) {
    if (
      message.direction !== "outbound" ||
      message.isGroup ||
      message.chatType !== "dm" ||
      !message.messageId ||
      !message.text.trim()
    ) {
      continue;
    }

    if (jidMatchesPhoneE164(message.remoteJid, channelPhoneE164)) {
      return message;
    }
  }

  return null;
}

export function personalOutboundToChannelInbound(
  message: WhatsAppIngestMessage,
  senderPhoneE164: string
): WhatsAppInboundMessage {
  // From the global bot's perspective the chat partner is the user, not the
  // bot number stored on the personal outbound remoteJid.
  const senderRemoteJid = `${phoneDigits(senderPhoneE164)}@s.whatsapp.net`;

  return {
    senderPhoneE164,
    text: message.text.trim(),
    messageId: message.messageId,
    remoteJid: senderRemoteJid,
    isGroup: false,
  };
}
