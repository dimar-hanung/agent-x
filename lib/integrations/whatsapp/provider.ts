import type {
  WhatsAppConnectionStatus,
  WhatsAppInboundMessage,
  WhatsAppPresence,
  WhatsAppQrCode,
  WhatsAppReadMessage,
  WhatsAppSendResult,
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
    text: string
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

  disconnect(instanceName: string): Promise<void>;

  configureInstanceWebhook(instanceName: string): Promise<void>;

  verifyWebhook(req: Request): Promise<boolean>;

  parseInboundMessage(
    payload: WhatsAppWebhookPayload
  ): WhatsAppInboundMessage | null;
}
