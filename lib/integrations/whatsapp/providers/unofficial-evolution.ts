import { getEvolutionConfig } from "../env";
import type { WhatsAppProvider } from "../provider";
import { normalizePhoneE164 } from "../phone";
import type {
  WhatsAppChatInfo,
  WhatsAppConnectionStatus,
  WhatsAppFetchMessagesOptions,
  WhatsAppInboundMessage,
  WhatsAppIngestMessage,
  WhatsAppMediaMessage,
  WhatsAppParsedWebhook,
  WhatsAppPresence,
  WhatsAppQrCode,
  WhatsAppReadMessage,
  WhatsAppSendResult,
  WhatsAppStoredMessage,
  WhatsAppTextOptions,
  WhatsAppWebhookPayload,
} from "../types";

/** Short Evolution-managed typing pulse; the endpoint clears it after delay. */
const DEFAULT_TYPING_DELAY_MS = 1_200;

function isLocalEvolutionWebhook(req: Request): boolean {
  const host = (req.headers.get("host") ?? "").toLowerCase();
  if (
    host.startsWith("127.0.0.1") ||
    host.startsWith("localhost") ||
    host.startsWith("[::1]")
  ) {
    return true;
  }

  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const ip = forwarded ?? realIp ?? "";

  if (!ip) {
    return false;
  }

  if (ip === "127.0.0.1" || ip === "::1") {
    return true;
  }

  if (ip.startsWith("10.") || ip.startsWith("192.168.")) {
    return true;
  }

  if (ip.startsWith("172.")) {
    const second = Number(ip.split(".")[1]);
    return second >= 16 && second <= 31;
  }

  return false;
}

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

function extractRemoteJid(data: Record<string, unknown>): string | null {
  const key = data.key as
    | { remoteJid?: string; remoteJidAlt?: string }
    | undefined;

  let jid = key?.remoteJid ?? null;

  if (jid?.includes("@lid") && key?.remoteJidAlt) {
    jid = key.remoteJidAlt;
  }

  if (!jid || jid.includes("@broadcast")) {
    return null;
  }

  return jid;
}

function isGroupJid(jid: string): boolean {
  return jid.includes("@g.us");
}

function extractSenderName(data: Record<string, unknown>): string | undefined {
  const pushName = data.pushName;
  if (typeof pushName === "string" && pushName.trim()) {
    return pushName.trim();
  }

  return undefined;
}

function extractParticipantJid(data: Record<string, unknown>): string | undefined {
  const key = data.key as { participant?: string; participantAlt?: string } | undefined;
  let participant = key?.participant;

  if (participant?.includes("@lid") && key?.participantAlt) {
    participant = key.participantAlt;
  }

  return participant ?? undefined;
}

function parseMessageTimestamp(data: Record<string, unknown>): Date | undefined {
  const messageTimestamp = data.messageTimestamp;

  if (typeof messageTimestamp === "number") {
    return new Date(messageTimestamp * 1000);
  }

  if (typeof messageTimestamp === "string") {
    const parsed = Number(messageTimestamp);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed * 1000);
    }
  }

  return undefined;
}

function extractIngestDataRecords(
  payload: WhatsAppWebhookPayload
): Record<string, unknown>[] {
  const event = payload.event?.toLowerCase().replace(/_/g, ".") ?? "";

  if (event !== "messages.upsert") {
    return [];
  }

  const data = payload.data;

  if (Array.isArray(data)) {
    return data.filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null
    );
  }

  if (typeof data === "object" && data !== null) {
    const record = data as Record<string, unknown>;
    const nested = record.messages;

    if (Array.isArray(nested)) {
      return nested.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null
      );
    }

    return [record];
  }

  return [];
}

function buildIngestMessage(
  data: Record<string, unknown>
): WhatsAppIngestMessage | null {
  const remoteJid = extractRemoteJid(data);

  if (!remoteJid) {
    return null;
  }

  const text = extractMessageText(data);

  if (!text?.trim()) {
    return null;
  }

  const key = data.key as
    | {
        id?: string;
        remoteJid?: string;
        fromMe?: boolean;
      }
    | undefined;

  const fromMe = Boolean(key?.fromMe);
  const isGroup = isGroupJid(remoteJid);
  const participantJid = extractParticipantJid(data);
  const senderJid = isGroup ? participantJid : remoteJid;
  const senderDigits = senderJid?.replace(/@.*$/, "").replace(/\D/g, "");

  return {
    remoteJid,
    chatType: isGroup ? "group" : "dm",
    senderJid,
    senderName: extractSenderName(data),
    senderPhoneE164: senderDigits
      ? normalizePhoneE164(senderDigits)
      : undefined,
    direction: fromMe ? "outbound" : "inbound",
    text: text.trim(),
    messageId: key?.id,
    sentAt: parseMessageTimestamp(data),
    fromMe,
    isGroup,
  };
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
    const headers: Record<string, string> = {
      apikey: apiKey as string,
      ...(init?.headers as Record<string, string> | undefined),
    };

    // Only set JSON content-type when sending a body — bare DELETE/GET with
    // Content-Type: application/json makes Evolution return 400 ([object Object]).
    if (init?.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
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

    const text = await response.text();
    if (!text.trim()) {
      return {} as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return {} as T;
    }
  }

  private buildCreatePayload(instanceName: string) {
    const { webhookUrl, webhookSecret } = getEvolutionConfig();

    return {
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
    };
  }

  private async createInstance(instanceName: string): Promise<void> {
    await this.request("/instance/create", {
      method: "POST",
      body: JSON.stringify(this.buildCreatePayload(instanceName)),
    });

    const { webhookUrl } = getEvolutionConfig();
    if (webhookUrl) {
      await this.configureInstanceWebhook(instanceName);
    }
  }

  async ensureInstance(instanceName: string): Promise<void> {
    let created = false;
    try {
      await this.request(`/instance/connectionState/${instanceName}`);
    } catch {
      created = true;
      await this.createInstance(instanceName);
    }

    if (!created) {
      const { webhookUrl } = getEvolutionConfig();
      if (webhookUrl) {
        await this.configureInstanceWebhook(instanceName);
      }
    }
  }

  async createNamedInstance(instanceName: string): Promise<void> {
    await this.createInstance(instanceName);
  }

  async discardInstance(instanceName: string): Promise<void> {
    try {
      await this.request(`/instance/logout/${instanceName}`, {
        method: "DELETE",
      });
    } catch {
      // Best-effort — old instance may already be gone.
    }

    try {
      await this.request(`/instance/delete/${instanceName}`, {
        method: "DELETE",
      });
    } catch {
      // Best-effort — Evolution often 400s on zombie sessions.
    }
  }

  async configureInstanceWebhook(instanceName: string): Promise<void> {
    const { webhookUrl, webhookSecret } = getEvolutionConfig();

    if (!webhookUrl) {
      return;
    }

    // evoapicloud v2.3.7 requires nested { webhook: {...} } — flat body returns
    // 400 "instance requires property \"webhook\"".
    const body = {
      webhook: {
        enabled: true,
        url: webhookUrl,
        webhookByEvents: false,
        webhookBase64: false,
        events: ["MESSAGES_UPSERT"],
        ...(webhookSecret
          ? { headers: { "x-webhook-secret": webhookSecret } }
          : {}),
      },
    };

    try {
      await this.request(`/webhook/set/${instanceName}`, {
        method: "POST",
        body: JSON.stringify(body),
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
    text: string,
    options?: WhatsAppTextOptions
  ): Promise<WhatsAppSendResult> {
    const digits = toPhoneE164.replace(/\D/g, "");

    try {
      await this.request(`/message/sendText/${instanceName}`, {
        method: "POST",
        body: JSON.stringify({
          number: digits,
          text,
          ...(options?.linkPreview !== undefined
            ? { linkPreview: options.linkPreview }
            : {}),
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

  async sendMedia(
    instanceName: string,
    toPhoneE164: string,
    media: WhatsAppMediaMessage
  ): Promise<WhatsAppSendResult> {
    const digits = toPhoneE164.replace(/\D/g, "");

    try {
      await this.request(`/message/sendMedia/${instanceName}`, {
        method: "POST",
        body: JSON.stringify({
          number: digits,
          mediatype: media.mediaType,
          mimetype: media.mimeType,
          caption: media.caption,
          media: media.mediaUrl,
          fileName: media.fileName,
        }),
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengirim media WhatsApp.",
      };
    }
  }

  async markAsRead(
    instanceName: string,
    messages: WhatsAppReadMessage[]
  ): Promise<void> {
    if (messages.length === 0) {
      return;
    }

    await this.request(`/chat/markMessageAsRead/${instanceName}`, {
      method: "POST",
      body: JSON.stringify({ readMessages: messages }),
    });
  }

  async sendPresence(
    instanceName: string,
    toPhoneE164: string,
    presence: WhatsAppPresence,
    delayMs = DEFAULT_TYPING_DELAY_MS
  ): Promise<void> {
    const digits = toPhoneE164.replace(/\D/g, "");

    // Evolution v2.3.x expects flat { number, presence, delay } — nested
    // `options` returns 400 "requires property presence/delay".
    await this.request(`/chat/sendPresence/${instanceName}`, {
      method: "POST",
      body: JSON.stringify({
        number: digits,
        presence,
        delay: delayMs,
      }),
    });
  }

  async disconnect(instanceName: string): Promise<void> {
    await this.request(`/instance/logout/${instanceName}`, {
      method: "DELETE",
    });
  }

  async verifyWebhook(req: Request): Promise<boolean> {
    const { webhookSecret, apiKey } = getEvolutionConfig();
    const apikeyHeader =
      req.headers.get("apikey")?.trim() ??
      req.headers.get("Apikey")?.trim() ??
      req.headers.get("APIKEY")?.trim() ??
      null;
    const authHeader = req.headers.get("authorization")?.trim() ?? null;
    const webhookSecretHeader =
      req.headers.get("x-webhook-secret")?.trim() ??
      req.headers.get("X-Webhook-Secret")?.trim() ??
      null;

    if (apiKey && apikeyHeader === apiKey) {
      return true;
    }

    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null;

    if (apiKey && bearerToken === apiKey) {
      return true;
    }

    if (!webhookSecret) {
      return true;
    }

    const secretMatches = Boolean(
      webhookSecretHeader === webhookSecret ||
        authHeader === webhookSecret ||
        bearerToken === webhookSecret
    );

    if (secretMatches) {
      return true;
    }

    if (isLocalEvolutionWebhook(req)) {
      return true;
    }

    return false;
  }

  parseInboundMessage(
    payload: WhatsAppWebhookPayload
  ): WhatsAppInboundMessage | null {
    const ingest = this.parseIngestMessage(payload);

    if (!ingest || ingest.isGroup || ingest.fromMe || !ingest.senderPhoneE164) {
      return null;
    }

    return {
      senderPhoneE164: ingest.senderPhoneE164,
      text: ingest.text,
      messageId: ingest.messageId,
      remoteJid: ingest.remoteJid,
    };
  }

  parseIngestMessage(payload: WhatsAppWebhookPayload): WhatsAppIngestMessage | null {
    const records = extractIngestDataRecords(payload);

    for (const record of records) {
      const message = buildIngestMessage(record);
      if (message) {
        return message;
      }
    }

    return null;
  }

  parseIngestMessages(payload: WhatsAppWebhookPayload): WhatsAppIngestMessage[] {
    return extractIngestDataRecords(payload)
      .map((record) => buildIngestMessage(record))
      .filter((message): message is WhatsAppIngestMessage => message !== null);
  }

  parseInboundMessageForInstance(
    payload: WhatsAppWebhookPayload
  ): WhatsAppParsedWebhook {
    return {
      instanceName: payload.instance,
      message: this.parseIngestMessage(payload),
      messages: this.parseIngestMessages(payload),
    };
  }

  async findChats(instanceName: string): Promise<WhatsAppChatInfo[]> {
    const data = await this.request<unknown[]>(
      `/chat/findChats/${instanceName}`,
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );

    if (!Array.isArray(data)) {
      return [];
    }

    return data
      .map((item): WhatsAppChatInfo | null => {
        const record = item as Record<string, unknown>;
        const remoteJid =
          (typeof record.id === "string" ? record.id : null) ??
          (typeof record.remoteJid === "string" ? record.remoteJid : null);

        if (!remoteJid || remoteJid.includes("@broadcast")) {
          return null;
        }

        const name =
          (typeof record.name === "string" && record.name.trim()) ||
          (typeof record.pushName === "string" && record.pushName.trim()) ||
          remoteJid.replace(/@.*$/, "");

        const updatedAt =
          typeof record.updatedAt === "string"
            ? new Date(record.updatedAt)
            : typeof record.conversationTimestamp === "number"
              ? new Date(record.conversationTimestamp * 1000)
              : undefined;

        return {
          remoteJid,
          chatType: isGroupJid(remoteJid) ? "group" : "dm",
          displayName: name,
          lastMessageAt: updatedAt,
        };
      })
      .filter((chat): chat is WhatsAppChatInfo => chat !== null);
  }

  async findMessages(
    instanceName: string,
    remoteJid: string,
    options?: WhatsAppFetchMessagesOptions
  ): Promise<WhatsAppStoredMessage[]> {
    const limit = options?.limit ?? 50;

    const data = await this.request<unknown[]>(
      `/chat/findMessages/${instanceName}`,
      {
        method: "POST",
        body: JSON.stringify({
          where: {
            key: {
              remoteJid,
            },
          },
          page: 1,
          offset: limit,
        }),
      }
    );

    if (!Array.isArray(data)) {
      return [];
    }

    const messages: WhatsAppStoredMessage[] = [];

    for (const item of data) {
      const record = item as Record<string, unknown>;
      const ingest = buildIngestMessage(record);

      if (!ingest) {
        continue;
      }

      if (options?.since && ingest.sentAt && ingest.sentAt < options.since) {
        continue;
      }

      messages.push({
        waMessageId: ingest.messageId ?? `${remoteJid}-${messages.length}`,
        remoteJid: ingest.remoteJid,
        chatType: ingest.chatType,
        senderJid: ingest.senderJid,
        senderName: ingest.senderName,
        direction: ingest.direction,
        text: ingest.text,
        sentAt: ingest.sentAt ?? new Date(),
      });
    }

    return messages.sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
  }
}
