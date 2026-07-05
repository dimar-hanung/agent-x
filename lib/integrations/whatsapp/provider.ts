import type {
  WhatsAppConnectionStatus,
  WhatsAppInboundMessage,
  WhatsAppQrCode,
  WhatsAppSendResult,
  WhatsAppWebhookPayload,
} from "./types";

export interface WhatsAppProvider {
  readonly name: string;

  ensureInstance(instanceName: string): Promise<void>;

  getConnectionStatus(instanceName: string): Promise<WhatsAppConnectionStatus>;

  getQrCode(instanceName: string): Promise<WhatsAppQrCode | null>;

  sendText(
    instanceName: string,
    toPhoneE164: string,
    text: string
  ): Promise<WhatsAppSendResult>;

  disconnect(instanceName: string): Promise<void>;

  configureInstanceWebhook(instanceName: string): Promise<void>;

  verifyWebhook(req: Request): Promise<boolean>;

  parseInboundMessage(
    payload: WhatsAppWebhookPayload
  ): WhatsAppInboundMessage | null;
}
