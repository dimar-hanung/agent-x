export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppMediaMessage {
  mediaType: "image" | "video" | "document";
  mediaUrl: string;
  mimeType: string;
  fileName: string;
  caption?: string;
}

export interface WhatsAppTextOptions {
  linkPreview?: boolean;
}

export interface WhatsAppConnectionStatus {
  status: "disconnected" | "pairing" | "connected";
  phoneE164?: string;
}

export type WhatsAppPresence = "composing" | "recording";

export interface WhatsAppReadMessage {
  remoteJid: string;
  fromMe: boolean;
  id: string;
}

export interface WhatsAppInboundMessage {
  senderPhoneE164: string;
  text: string;
  messageId?: string;
  /** Original WhatsApp key.remoteJid — required for mark-as-read. */
  remoteJid?: string;
}

export interface WhatsAppQrCode {
  base64: string;
  pairingCode?: string;
}

export interface WhatsAppWebhookPayload {
  event: string;
  instance?: string;
  sender?: string;
  data?: unknown;
}
