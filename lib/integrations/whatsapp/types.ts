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

export type WhatsAppChatType = "dm" | "group";

export interface WhatsAppChatInfo {
  remoteJid: string;
  chatType: WhatsAppChatType;
  displayName: string;
  lastMessageAt?: Date;
}

export interface WhatsAppStoredMessage {
  waMessageId: string;
  remoteJid: string;
  chatType: WhatsAppChatType;
  senderJid?: string;
  senderName?: string;
  direction: "inbound" | "outbound";
  text: string;
  sentAt: Date;
}

export interface WhatsAppFetchMessagesOptions {
  since?: Date;
  limit?: number;
}

export interface WhatsAppIngestMessage {
  remoteJid: string;
  chatType: WhatsAppChatType;
  senderJid?: string;
  senderName?: string;
  senderPhoneE164?: string;
  direction: "inbound" | "outbound";
  text: string;
  messageId?: string;
  sentAt?: Date;
  fromMe: boolean;
  isGroup: boolean;
}

export interface WhatsAppParsedWebhook {
  instanceName?: string;
  message: WhatsAppIngestMessage | null;
  messages?: WhatsAppIngestMessage[];
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
