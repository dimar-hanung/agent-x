import { and, eq, ne } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  whatsappUserInstances,
  type WhatsAppUserInstanceStatus,
} from "@/lib/db/schema";
import { getWhatsAppProvider } from "@/lib/integrations/whatsapp/factory";
import { isEvolutionConfigured } from "@/lib/integrations/whatsapp/env";

export interface WhatsAppUserInstanceView {
  status: WhatsAppUserInstanceStatus;
  phoneE164: string | null;
  instanceName: string;
  connectedAt: string | null;
}

function toView(
  row: typeof whatsappUserInstances.$inferSelect
): WhatsAppUserInstanceView {
  return {
    status: row.status as WhatsAppUserInstanceStatus,
    phoneE164: row.phoneE164,
    instanceName: row.instanceName,
    connectedAt: row.connectedAt?.toISOString() ?? null,
  };
}

const USER_INSTANCE_PREFIX = "agentx-u-";

function buildInstanceName(userId: string): string {
  const shortId = userId.replace(/-/g, "").slice(0, 12);
  return `${USER_INSTANCE_PREFIX}${shortId}`;
}

/**
 * Personal instances must stay read-only even when the DB row was rotated or
 * removed, so the webhook can recognize them by name alone.
 */
export function isUserInstanceName(instanceName: string): boolean {
  return instanceName.startsWith(USER_INSTANCE_PREFIX);
}

async function getOrCreateRow(userId: string) {
  const [existing] = await db
    .select()
    .from(whatsappUserInstances)
    .where(eq(whatsappUserInstances.userId, userId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(whatsappUserInstances)
    .values({
      userId,
      instanceName: buildInstanceName(userId),
      status: "disconnected",
    })
    .returning();

  return created;
}

export async function getUserInstance(
  userId: string
): Promise<WhatsAppUserInstanceView> {
  const row = await getOrCreateRow(userId);
  return toView(row);
}

export async function isUserInstanceConnected(userId: string): Promise<boolean> {
  const instance = await getUserInstance(userId);
  return instance.status === "connected";
}

export async function resolveUserIdByInstanceName(
  instanceName: string
): Promise<string | null> {
  const [row] = await db
    .select({ userId: whatsappUserInstances.userId })
    .from(whatsappUserInstances)
    .where(eq(whatsappUserInstances.instanceName, instanceName))
    .limit(1);

  return row?.userId ?? null;
}

export async function startUserPairing(
  userId: string
): Promise<WhatsAppUserInstanceView> {
  if (!isEvolutionConfigured()) {
    throw new Error("Evolution API belum dikonfigurasi.");
  }

  const row = await getOrCreateRow(userId);
  const provider = getWhatsAppProvider();
  const oldInstanceName = row.instanceName;
  const newInstanceName = `${buildInstanceName(userId)}-${Date.now().toString(36)}`;

  await provider.createNamedInstance(newInstanceName);

  const [updated] = await db
    .update(whatsappUserInstances)
    .set({
      instanceName: newInstanceName,
      status: "pairing",
      phoneE164: null,
      connectedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(whatsappUserInstances.id, row.id))
    .returning();

  if (oldInstanceName !== newInstanceName) {
    void provider.discardInstance(oldInstanceName);
  }

  return toView(updated);
}

export async function syncUserConnectionStatus(
  userId: string
): Promise<WhatsAppUserInstanceView> {
  const row = await getOrCreateRow(userId);
  const provider = getWhatsAppProvider();
  const remote = await provider.getConnectionStatus(row.instanceName);
  const now = new Date();
  const isNowConnected = remote.status === "connected";

  if (isNowConnected) {
    await provider.configureInstanceWebhook(row.instanceName);
  }

  if (remote.phoneE164) {
    const [conflict] = await db
      .select({ id: whatsappUserInstances.id })
      .from(whatsappUserInstances)
      .where(
        and(
          eq(whatsappUserInstances.phoneE164, remote.phoneE164),
          ne(whatsappUserInstances.userId, userId)
        )
      )
      .limit(1);

    if (conflict) {
      throw new Error("Nomor WhatsApp ini sudah terhubung ke akun lain.");
    }
  }

  const [updated] = await db
    .update(whatsappUserInstances)
    .set({
      status: remote.status,
      phoneE164: remote.phoneE164 ?? row.phoneE164,
      connectedAt:
        isNowConnected
          ? row.connectedAt ?? now
          : remote.status === "disconnected"
            ? null
            : row.connectedAt,
      updatedAt: now,
    })
    .where(eq(whatsappUserInstances.id, row.id))
    .returning();


  return toView(updated);
}

export async function disconnectUserInstance(
  userId: string
): Promise<WhatsAppUserInstanceView> {
  const row = await getOrCreateRow(userId);
  const provider = getWhatsAppProvider();

  try {
    await provider.disconnect(row.instanceName);
  } catch {
    // Best-effort logout.
  }

  const [updated] = await db
    .update(whatsappUserInstances)
    .set({
      status: "disconnected",
      phoneE164: null,
      connectedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(whatsappUserInstances.id, row.id))
    .returning();

  return toView(updated);
}

export async function getUserQrCode(userId: string): Promise<{
  base64: string;
  pairingCode?: string;
} | null> {
  const row = await getOrCreateRow(userId);
  const provider = getWhatsAppProvider();
  return provider.getQrCode(row.instanceName);
}

export async function getUserInstanceRow(userId: string) {
  return getOrCreateRow(userId);
}
