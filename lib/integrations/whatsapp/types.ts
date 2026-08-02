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

export interface WhatsAppAudioMessage {
  base64: string;
  encoding?: boolean;
  delayMs?: number;
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

export type WhatsAppInboundMediaType =
  | "audio"
  | "image"
  | "document"
  | "video";

export interface WhatsAppMediaMessageKey {
  remoteJid: string;
  fromMe: boolean;
  id: string;
}

export interface WhatsAppInboundAttachmentMeta {
  mediaType: WhatsAppInboundMediaType;
  mimeType: string;
  fileName: string;
  caption?: string;
  durationSeconds?: number;
  ptt?: boolean;
  messageKey: WhatsAppMediaMessageKey;
}

export interface WhatsAppDownloadedMedia {
  base64: string;
  mimeType: string;
  buffer: Buffer;
}

export interface WhatsAppSavedAttachment {
  fileId: string;
  fileName: string;
  mimeType: string;
  mediaType: WhatsAppInboundMediaType;
  requiresVision: boolean;
  textContent?: string;
  dataUrl?: string;
}

export interface WhatsAppInboundMessage {
  senderPhoneE164: string;
  text: string;
  messageId?: string;
  /** Original WhatsApp key.remoteJid — required for mark-as-read. */
  remoteJid?: string;
  isGroup?: boolean;
  groupFolderSlug?: string;
  attachments?: WhatsAppInboundAttachmentMeta[];
}

export type WhatsAppChatType = "dm" | "group";


export type WhatsAppIngestMessageType =
  | "text"
  | "audio"
  | "image"
  | "video"
  | "document"
  | "unknown";

export interface WhatsAppIngestMediaPlaceholder {
  mimeType?: string;
  fileName?: string;
  caption?: string;
  durationSeconds?: number;
  ptt?: boolean;
}
export interface WhatsAppIngestMessage {
  remoteJid: string;
  chatType: WhatsAppChatType;
  senderJid?: string;
  senderName?: string;
  senderPhoneE164?: string;
  direction: "inbound" | "outbound";
  messageType: WhatsAppIngestMessageType;
  text: string;
  mediaPlaceholder?: WhatsAppIngestMediaPlaceholder;
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
