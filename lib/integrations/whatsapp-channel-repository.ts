import { and, eq, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  users,
  whatsappChannelConfig,
  type WhatsAppChannelStatus,
} from "@/lib/db/schema";
import { getEvolutionConfig } from "@/lib/integrations/whatsapp/env";
import { getWhatsAppProvider } from "@/lib/integrations/whatsapp/factory";
import {
  normalizePhoneE164,
} from "@/lib/integrations/whatsapp/phone";

const SINGLETON_CONFIG_ID = "00000000-0000-4000-8000-000000000001";

export interface WhatsAppChannelConfigView {
  status: WhatsAppChannelStatus;
  channelPhoneE164: string | null;
  instanceName: string;
  connectedAt: string | null;
}

export interface WhatsAppUserPairingStatus {
  channel: WhatsAppChannelConfigView;
  userPhoneE164: string | null;
}

async function getOrCreateConfigRow() {
  const { instanceName } = getEvolutionConfig();

  const [existing] = await db
    .select()
    .from(whatsappChannelConfig)
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(whatsappChannelConfig)
    .values({
      id: SINGLETON_CONFIG_ID,
      instanceName,
      status: "disconnected",
    })
    .returning();

  return created;
}

function toConfigView(
  row: typeof whatsappChannelConfig.$inferSelect
): WhatsAppChannelConfigView {
  return {
    status: row.status as WhatsAppChannelStatus,
    channelPhoneE164: row.channelPhoneE164,
    instanceName: row.instanceName,
    connectedAt: row.connectedAt?.toISOString() ?? null,
  };
}

export async function getChannelConfig(): Promise<WhatsAppChannelConfigView> {
  const row = await getOrCreateConfigRow();
  return toConfigView(row);
}

export async function isChannelConnected(): Promise<boolean> {
  const config = await getChannelConfig();
  return config.status === "connected";
}

export async function startChannelPairing(): Promise<WhatsAppChannelConfigView> {
  const row = await getOrCreateConfigRow();
  const provider = getWhatsAppProvider();

  await provider.ensureInstance(row.instanceName);

  const [updated] = await db
    .update(whatsappChannelConfig)
    .set({
      status: "pairing",
      updatedAt: new Date(),
    })
    .where(eq(whatsappChannelConfig.id, row.id))
    .returning();

  return toConfigView(updated);
}

export async function syncChannelConnectionStatus(): Promise<WhatsAppChannelConfigView> {
  const row = await getOrCreateConfigRow();
  const provider = getWhatsAppProvider();
  const remote = await provider.getConnectionStatus(row.instanceName);
  const now = new Date();

  if (remote.status === "connected") {
    await provider.configureInstanceWebhook(row.instanceName);
  }

  const [updated] = await db
    .update(whatsappChannelConfig)
    .set({
      status: remote.status,
      channelPhoneE164: remote.phoneE164 ?? row.channelPhoneE164,
      connectedAt:
        remote.status === "connected"
          ? row.connectedAt ?? now
          : remote.status === "disconnected"
            ? null
            : row.connectedAt,
      updatedAt: now,
    })
    .where(eq(whatsappChannelConfig.id, row.id))
    .returning();

  return toConfigView(updated);
}

export async function disconnectChannel(): Promise<WhatsAppChannelConfigView> {
  const row = await getOrCreateConfigRow();
  const provider = getWhatsAppProvider();

  try {
    await provider.disconnect(row.instanceName);
  } catch {
    // Best-effort logout; local state is cleared regardless.
  }

  const [updated] = await db
    .update(whatsappChannelConfig)
    .set({
      status: "disconnected",
      channelPhoneE164: null,
      connectedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(whatsappChannelConfig.id, row.id))
    .returning();

  return toConfigView(updated);
}

export async function getChannelQrCode(): Promise<{
  base64: string;
  pairingCode?: string;
} | null> {
  const row = await getOrCreateConfigRow();
  const provider = getWhatsAppProvider();
  return provider.getQrCode(row.instanceName);
}

export async function getUserWhatsAppPhone(
  userId: string
): Promise<string | null> {
  const [user] = await db
    .select({ whatsappPhoneE164: users.whatsappPhoneE164 })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.whatsappPhoneE164 ?? null;
}

export async function setUserWhatsAppPhone(
  userId: string,
  phoneInput: string
): Promise<string> {
  const phoneE164 = normalizePhoneE164(phoneInput);

  const [conflict] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(eq(users.whatsappPhoneE164, phoneE164), ne(users.id, userId))
    )
    .limit(1);

  if (conflict) {
    throw new Error("Nomor HP ini sudah dipasangkan ke akun lain.");
  }

  await db
    .update(users)
    .set({
      whatsappPhoneE164: phoneE164,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return phoneE164;
}

export async function clearUserWhatsAppPhone(userId: string): Promise<void> {
  await db
    .update(users)
    .set({
      whatsappPhoneE164: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function resolveUserIdByPhone(
  phoneInput: string
): Promise<string | null> {
  const phoneE164 = normalizePhoneE164(phoneInput);

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.whatsappPhoneE164, phoneE164))
    .limit(1);

  return user?.id ?? null;
}

export async function getUserPairingStatus(
  userId: string
): Promise<WhatsAppUserPairingStatus> {
  const [channel, userPhoneE164] = await Promise.all([
    getChannelConfig(),
    getUserWhatsAppPhone(userId),
  ]);

  return { channel, userPhoneE164 };
}

export async function sendWhatsAppToUser(
  userId: string,
  text: string
): Promise<void> {
  const connected = await isChannelConnected();

  if (!connected) {
    return;
  }

  const [phone, config] = await Promise.all([
    getUserWhatsAppPhone(userId),
    getOrCreateConfigRow(),
  ]);

  if (!phone) {
    return;
  }

  const provider = getWhatsAppProvider();
  await provider.sendText(config.instanceName, phone, text);
}

export async function sendWhatsAppToPhone(
  phoneE164: string,
  text: string
): Promise<void> {
  const connected = await isChannelConnected();

  if (!connected) {
    throw new Error("Channel WhatsApp belum aktif.");
  }

  const config = await getOrCreateConfigRow();
  const provider = getWhatsAppProvider();
  await provider.sendText(config.instanceName, phoneE164, text);
}
