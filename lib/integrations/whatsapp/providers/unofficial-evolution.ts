import { getEvolutionConfig } from "../env";
import type { WhatsAppProvider } from "../provider";
import { normalizePhoneE164 } from "../phone";
import type {
  WhatsAppConnectionStatus,
  WhatsAppInboundMessage,
  WhatsAppQrCode,
  WhatsAppSendResult,
  WhatsAppWebhookPayload,
} from "../types";

interface EvolutionConnectResponse {
  base64?: string;
  pairingCode?: string;
  code?: string;
  instance?: { state?: string };
}

interface EvolutionConnectionStateResponse {
  instance?: {
    state?: string;
    owner?: string;
  };
  state?: string;
}

function mapConnectionState(
  state: string | undefined
): WhatsAppConnectionStatus["status"] {
  const normalized = state?.toLowerCase();

  if (normalized === "open" || normalized === "connected") {
    return "connected";
  }

  if (normalized === "connecting" || normalized === "pairing") {
    return "pairing";
  }

  return "disconnected";
}

function extractOwnerPhone(owner: string | undefined): string | undefined {
  if (!owner) {
    return undefined;
  }

  const digits = owner.replace(/@.*$/, "").replace(/\D/g, "");

  if (!digits) {
    return undefined;
  }

  return normalizePhoneE164(digits);
}

function extractMessageText(data: Record<string, unknown>): string | null {
  const message = data.message as Record<string, unknown> | undefined;

  if (!message) {
    return null;
  }

  if (typeof message.conversation === "string") {
    return message.conversation;
  }

  const extended = message.extendedTextMessage as
    | { text?: string }
    | undefined;

  if (extended?.text) {
    return extended.text;
  }

  const ephemeral = message.ephemeralMessage as
    | { message?: Record<string, unknown> }
    | undefined;

  if (ephemeral?.message) {
    return extractMessageText({ message: ephemeral.message });
  }

  return null;
}

function extractSenderJid(
  data: Record<string, unknown>,
  payload: WhatsAppWebhookPayload
): string | null {
  const key = data.key as
    | { remoteJid?: string; remoteJidAlt?: string; fromMe?: boolean }
    | undefined;

  if (key?.fromMe) {
    return null;
  }

  let jid = key?.remoteJid ?? null;

  if (jid?.includes("@lid") && key?.remoteJidAlt) {
    jid = key.remoteJidAlt;
  }

  if (!jid && typeof payload.sender === "string") {
    jid = payload.sender;
  }

  if (!jid || jid.includes("@g.us") || jid.includes("@broadcast")) {
    return null;
  }

  return jid;
}

export class UnofficialEvolutionWhatsAppProvider implements WhatsAppProvider {
  readonly name = "unofficial-evolution";

  private getConfig() {
    const config = getEvolutionConfig();

    if (!config.baseUrl || !config.apiKey) {
      throw new Error("Evolution API belum dikonfigurasi.");
    }

    return config;
  }

  private async request<T>(
    path: string,
    init?: RequestInit
  ): Promise<T> {
    const { baseUrl, apiKey } = this.getConfig();
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey as string,
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Evolution API error (${response.status}): ${body.slice(0, 200)}`
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  async ensureInstance(instanceName: string): Promise<void> {
    const { webhookUrl, webhookSecret } = getEvolutionConfig();

    try {
      await this.request(`/instance/connectionState/${instanceName}`);
    } catch {
      await this.request("/instance/create", {
        method: "POST",
        body: JSON.stringify({
          instanceName,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
          ...(webhookUrl
            ? {
                webhook: {
                  url: webhookUrl,
                  enabled: true,
                  webhookByEvents: false,
                  webhookBase64: false,
                  events: ["MESSAGES_UPSERT"],
                  headers: webhookSecret
                    ? { "x-webhook-secret": webhookSecret }
                    : undefined,
                },
              }
            : {}),
        }),
      });
    }

    if (webhookUrl) {
      await this.configureInstanceWebhook(instanceName);
    }
  }

  async configureInstanceWebhook(instanceName: string): Promise<void> {
    const { webhookUrl, webhookSecret } = getEvolutionConfig();

    if (!webhookUrl) {
      return;
    }

    try {
      await this.request(`/webhook/set/${instanceName}`, {
        method: "POST",
        body: JSON.stringify({
          webhook: {
            enabled: true,
            url: webhookUrl,
            webhookByEvents: false,
            webhookBase64: false,
            events: ["MESSAGES_UPSERT"],
            headers: webhookSecret
              ? { "x-webhook-secret": webhookSecret }
              : undefined,
          },
        }),
      });
    } catch (error) {
      console.error("Gagal set webhook Evolution:", error);
    }
  }

  async getConnectionStatus(
    instanceName: string
  ): Promise<WhatsAppConnectionStatus> {
    try {
      const data = await this.request<EvolutionConnectionStateResponse>(
        `/instance/connectionState/${instanceName}`
      );
      const state = data.instance?.state ?? data.state;
      const status = mapConnectionState(state);

      return {
        status,
        phoneE164: extractOwnerPhone(data.instance?.owner),
      };
    } catch {
      return { status: "disconnected" };
    }
  }

  async getQrCode(instanceName: string): Promise<WhatsAppQrCode | null> {
    const data = await this.request<EvolutionConnectResponse>(
      `/instance/connect/${instanceName}`
    );

    const base64 = data.base64 ?? data.code;

    if (!base64) {
      return null;
    }

    return {
      base64: base64.startsWith("data:")
        ? base64
        : `data:image/png;base64,${base64}`,
      pairingCode: data.pairingCode,
    };
  }

  async sendText(
    instanceName: string,
    toPhoneE164: string,
    text: string
  ): Promise<WhatsAppSendResult> {
    const digits = toPhoneE164.replace(/\D/g, "");

    try {
      await this.request(`/message/sendText/${instanceName}`, {
        method: "POST",
        body: JSON.stringify({
          number: digits,
          text,
        }),
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Gagal mengirim pesan WhatsApp.",
      };
    }
  }

  async disconnect(instanceName: string): Promise<void> {
    await this.request(`/instance/logout/${instanceName}`, {
      method: "DELETE",
    });
  }

  async verifyWebhook(req: Request): Promise<boolean> {
    const { webhookSecret, apiKey } = getEvolutionConfig();
    const apikeyHeader = req.headers.get("apikey");

    // Evolution sends the global/instance apikey header on webhooks
    if (apiKey && apikeyHeader === apiKey) {
      return true;
    }

    if (!webhookSecret) {
      return true;
    }

    const secretHeader =
      req.headers.get("x-webhook-secret") ??
      req.headers.get("authorization");

    if (!secretHeader) {
      return false;
    }

    return (
      secretHeader === webhookSecret ||
      secretHeader === `Bearer ${webhookSecret}`
    );
  }

  parseInboundMessage(
    payload: WhatsAppWebhookPayload
  ): WhatsAppInboundMessage | null {
    const event = payload.event?.toLowerCase().replace(/_/g, ".") ?? "";

    if (event !== "messages.upsert") {
      return null;
    }

    const data = payload.data as Record<string, unknown> | undefined;

    if (!data) {
      return null;
    }

    const jid = extractSenderJid(data, payload);

    if (!jid) {
      return null;
    }

    const text = extractMessageText(data);

    if (!text?.trim()) {
      return null;
    }

    const digits = jid.replace(/@.*$/, "").replace(/\D/g, "");

    if (!digits) {
      return null;
    }

    const key = data.key as { id?: string } | undefined;

    return {
      senderPhoneE164: normalizePhoneE164(digits),
      text: text.trim(),
      messageId: key?.id,
    };
  }
}
