import type { WhatsAppProvider } from "../provider";
import type {
  WhatsAppConnectionStatus,
  WhatsAppInboundMessage,
  WhatsAppPresence,
  WhatsAppQrCode,
  WhatsAppReadMessage,
  WhatsAppSendResult,
  WhatsAppWebhookPayload,
} from "../types";

function notImplemented(): never {
  throw new Error("WhatsApp official provider belum diimplementasikan.");
}

export class OfficialMetaWhatsAppProvider implements WhatsAppProvider {
  readonly name = "official-meta";

  async ensureInstance(): Promise<void> {
    notImplemented();
  }

  async createNamedInstance(): Promise<void> {
    notImplemented();
  }

  async discardInstance(): Promise<void> {
    notImplemented();
  }

  async getConnectionStatus(): Promise<WhatsAppConnectionStatus> {
    notImplemented();
  }

  async getQrCode(): Promise<WhatsAppQrCode | null> {
    notImplemented();
  }

  async sendText(): Promise<WhatsAppSendResult> {
    notImplemented();
  }

  async sendMedia(): Promise<WhatsAppSendResult> {
    notImplemented();
  }

  async markAsRead(
    _instanceName: string,
    _messages: WhatsAppReadMessage[]
  ): Promise<void> {
    notImplemented();
  }

  async sendPresence(
    _instanceName: string,
    _toPhoneE164: string,
    _presence: WhatsAppPresence,
    _delayMs?: number
  ): Promise<void> {
    notImplemented();
  }

  async disconnect(): Promise<void> {
    notImplemented();
  }

  async configureInstanceWebhook(): Promise<void> {
    notImplemented();
  }

  async verifyWebhook(): Promise<boolean> {
    notImplemented();
  }

  parseInboundMessage(
    _payload: WhatsAppWebhookPayload
  ): WhatsAppInboundMessage | null {
    notImplemented();
  }
}
