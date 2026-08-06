import type {
  WhatsAppAudioMessage,
  WhatsAppConnectionStatus,
  WhatsAppContactRecord,
  WhatsAppDownloadedMedia,
  WhatsAppGroupRecord,
  WhatsAppInboundMessage,
  WhatsAppIngestMessage,
  WhatsAppMediaMessage,
  WhatsAppMediaMessageKey,
  WhatsAppParsedWebhook,
  WhatsAppPresence,
  WhatsAppQrCode,
  WhatsAppReadMessage,
  WhatsAppSendResult,
  WhatsAppTextOptions,
  WhatsAppWebhookPayload,
} from "./types";

export interface WhatsAppProvider {
  readonly name: string;

  ensureInstance(instanceName: string): Promise<void>;

  /** Always POST /instance/create — use a unique name for a fresh QR. */
  createNamedInstance(instanceName: string): Promise<void>;

  /** Best-effort logout+delete; Evolution may 400 on zombie sessions. */
  discardInstance(instanceName: string): Promise<void>;

  getConnectionStatus(instanceName: string): Promise<WhatsAppConnectionStatus>;

  getQrCode(instanceName: string): Promise<WhatsAppQrCode | null>;

  sendText(
    instanceName: string,
    toPhoneE164: string,
    text: string,
    options?: WhatsAppTextOptions
  ): Promise<WhatsAppSendResult>;

  sendMedia(
    instanceName: string,
    toPhoneE164: string,
    media: WhatsAppMediaMessage
  ): Promise<WhatsAppSendResult>;

  sendAudio(
    instanceName: string,
    toPhoneE164: string,
    audio: WhatsAppAudioMessage
  ): Promise<WhatsAppSendResult>;

  /** Mark inbound messages as read (blue ticks). */
  markAsRead(
    instanceName: string,
    messages: WhatsAppReadMessage[]
  ): Promise<void>;

  /** Show typing/recording indicator to the contact. */
  sendPresence(
    instanceName: string,
    toPhoneE164: string,
    presence: WhatsAppPresence,
    delayMs?: number
  ): Promise<void>;

  downloadMediaMessage(
    instanceName: string,
    messageKey: WhatsAppMediaMessageKey
  ): Promise<WhatsAppDownloadedMedia | null>;

  disconnect(instanceName: string): Promise<void>;

  configureInstanceWebhook(instanceName: string): Promise<void>;

  verifyWebhook(req: Request): Promise<boolean>;

  parseInboundMessage(
    payload: WhatsAppWebhookPayload
  ): WhatsAppInboundMessage | null;

  parseIngestMessage(payload: WhatsAppWebhookPayload): WhatsAppIngestMessage | null;

  parseIngestMessages(payload: WhatsAppWebhookPayload): WhatsAppIngestMessage[];

  parseInboundMessageForInstance(
    payload: WhatsAppWebhookPayload
  ): WhatsAppParsedWebhook;

  findContacts(instanceName: string): Promise<WhatsAppContactRecord[]>;

  fetchAllGroups(instanceName: string): Promise<WhatsAppGroupRecord[]>;
}
