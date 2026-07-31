import { and, eq, inArray, lte, sql as drizzleSql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  whatsappInboxEvents,
  type WhatsAppInboxEvent,
} from "@/lib/db/schema";
import type { WhatsAppIngestMessage } from "@/lib/integrations/whatsapp/types";

export interface EnqueueWhatsAppInboxEventsInput {
  userId: string;
  instanceName: string;
  messages: WhatsAppIngestMessage[];
}

export async function enqueueWhatsAppInboxEvents(
  input: EnqueueWhatsAppInboxEventsInput
): Promise<number> {
  const values = input.messages.flatMap((message) => {
    if (!message.messageId) {
      return [];
    }

    return [
      {
        userId: input.userId,
        instanceName: input.instanceName,
        waMessageId: message.messageId,
        remoteJid: message.remoteJid,
        chatType: message.chatType,
        senderJid: message.senderJid,
        senderName: message.senderName,
        direction: message.direction,
        messageType: message.messageType,
        text: message.text,
        mediaMetadata: message.mediaPlaceholder
          ? { ...message.mediaPlaceholder }
          : null,
        sentAt: message.sentAt ?? new Date(),
      },
    ];
  });

  if (values.length === 0) {
    return 0;
  }

  const inserted = await db
    .insert(whatsappInboxEvents)
    .values(values)
    .onConflictDoNothing({
      target: [
        whatsappInboxEvents.userId,
        whatsappInboxEvents.waMessageId,
      ],
    })
    .returning({ id: whatsappInboxEvents.id });

  return inserted.length;
}

export async function getWhatsAppInboxCatchUpWatermark(
  userId: string
): Promise<number | null> {
  const [row] = await db
    .select({
      watermark: drizzleSql<string | null>`max(${whatsappInboxEvents.sequence})::text`,
    })
    .from(whatsappInboxEvents)
    .where(eq(whatsappInboxEvents.userId, userId));

  if (!row?.watermark) {
    return null;
  }

  const watermark = Number(row.watermark);
  return Number.isSafeInteger(watermark) ? watermark : null;
}

export async function hasUnfinishedWhatsAppInboxEventsThrough(
  userId: string,
  watermark: number
): Promise<boolean> {
  const [row] = await db
    .select({ id: whatsappInboxEvents.id })
    .from(whatsappInboxEvents)
    .where(
      and(
        eq(whatsappInboxEvents.userId, userId),
        lte(whatsappInboxEvents.sequence, watermark),
        inArray(whatsappInboxEvents.status, ["queued", "processing"])
      )
    )
    .limit(1);

  return Boolean(row);
}
export async function requeueStaleWhatsAppInboxEvents(
  lockedBefore: Date
): Promise<number> {
  const rows = await db
    .update(whatsappInboxEvents)
    .set({
      status: "queued",
      lockedAt: null,
      availableAt: new Date(),
      lastError: "Processing lock expired.",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(whatsappInboxEvents.status, "processing"),
        lte(whatsappInboxEvents.lockedAt, lockedBefore)
      )
    )
    .returning({ id: whatsappInboxEvents.id });

  return rows.length;
}

export async function claimWhatsAppInboxEvents(
  limit: number
): Promise<WhatsAppInboxEvent[]> {
  const capped = Math.min(Math.max(limit, 1), 100);
  const claimed = await db.execute<{ id: string }>(drizzleSql`
    WITH candidates AS (
      SELECT event.id
      FROM whatsapp_inbox_events AS event
      WHERE event.status = 'queued'
        AND event.available_at <= now()
        AND NOT EXISTS (
          SELECT 1
          FROM whatsapp_inbox_events AS earlier
          WHERE earlier.user_id = event.user_id
            AND earlier.remote_jid = event.remote_jid
            AND earlier.status IN ('queued', 'processing')
            AND (
              earlier.sequence < event.sequence
            )
        )
      ORDER BY event.sequence
      FOR UPDATE OF event SKIP LOCKED
      LIMIT ${capped}
    )
    UPDATE whatsapp_inbox_events AS event
    SET status = 'processing',
        attempts = event.attempts + 1,
        locked_at = now(),
        last_error = NULL,
        updated_at = now()
    FROM candidates
    WHERE event.id = candidates.id
    RETURNING event.id
  `);

  const ids = claimed.map((row) => row.id);
  if (ids.length === 0) {
    return [];
  }

  const rows = await db
    .select()
    .from(whatsappInboxEvents)
    .where(inArray(whatsappInboxEvents.id, ids));
  const byId = new Map(rows.map((row) => [row.id, row]));

  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}

export async function markWhatsAppInboxEventCompleted(
  eventId: string
): Promise<void> {
  await db
    .update(whatsappInboxEvents)
    .set({
      status: "completed",
      lockedAt: null,
      processedAt: new Date(),
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(whatsappInboxEvents.id, eventId));
}

export async function markWhatsAppInboxEventDeferred(
  eventId: string
): Promise<void> {
  await db
    .update(whatsappInboxEvents)
    .set({
      status: "deferred",
      lockedAt: null,
      processedAt: new Date(),
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(whatsappInboxEvents.id, eventId));
}

export async function retryOrFailWhatsAppInboxEvent(options: {
  event: WhatsAppInboxEvent;
  error: string;
  maxAttempts: number;
  retryAt: Date;
}): Promise<void> {
  const failed = options.event.attempts >= options.maxAttempts;

  await db
    .update(whatsappInboxEvents)
    .set({
      status: failed ? "failed" : "queued",
      availableAt: failed ? options.event.availableAt : options.retryAt,
      lockedAt: null,
      processedAt: failed ? new Date() : null,
      lastError: options.error.slice(0, 2000),
      updatedAt: new Date(),
    })
    .where(eq(whatsappInboxEvents.id, options.event.id));
}