export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface WhatsAppConnectionStatus {
  status: "disconnected" | "pairing" | "connected";
  phoneE164?: string;
}

export interface WhatsAppInboundMessage {
  senderPhoneE164: string;
  text: string;
  messageId?: string;
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
