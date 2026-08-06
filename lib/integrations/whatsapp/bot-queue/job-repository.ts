import { and, eq, inArray, lte, sql as drizzleSql } from "drizzle-orm";

import { db } from "@/lib/db";
import { whatsappBotJobs, type WhatsAppBotJob } from "@/lib/db/schema";
import type { WhatsAppSavedAttachment } from "@/lib/integrations/whatsapp/types";

export interface EnqueueWhatsAppBotJobInput {
  userId: string;
  waMessageId: string;
  text: string;
  attachments?: WhatsAppSavedAttachment[];
  inputMode?: "text" | "voice";
}

/**
 * Durably enqueue a bot reply job. Idempotent per (userId, waMessageId), so
 * Evolution webhook retries never create a second job for the same message.
 * Returns true when a new job row was inserted.
 */
export async function enqueueWhatsAppBotJob(
  input: EnqueueWhatsAppBotJobInput
): Promise<boolean> {
  const inserted = await db
    .insert(whatsappBotJobs)
    .values({
      userId: input.userId,
      waMessageId: input.waMessageId,
      text: input.text,
      attachments:
        input.attachments && input.attachments.length > 0
          ? input.attachments
          : null,
      inputMode: input.inputMode ?? "text",
    })
    .onConflictDoNothing({
      target: [whatsappBotJobs.userId, whatsappBotJobs.waMessageId],
    })
    .returning({ id: whatsappBotJobs.id });

  return inserted.length > 0;
}

export async function requeueStaleWhatsAppBotJobs(
  lockedBefore: Date
): Promise<number> {
  const rows = await db
    .update(whatsappBotJobs)
    .set({
      status: "queued",
      lockedAt: null,
      availableAt: new Date(),
      lastError: "Processing lock expired.",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(whatsappBotJobs.status, "processing"),
        lte(whatsappBotJobs.lockedAt, lockedBefore)
      )
    )
    .returning({ id: whatsappBotJobs.id });

  return rows.length;
}

/**
 * Claim the oldest queued job per user, skipping users that already have an
 * earlier queued/processing job. This preserves per-user (main channel) reply
 * order while letting different users run concurrently.
 */
export async function claimWhatsAppBotJobs(
  limit: number
): Promise<WhatsAppBotJob[]> {
  const capped = Math.min(Math.max(limit, 1), 100);
  const claimed = await db.execute<{ id: string }>(drizzleSql`
    WITH candidates AS (
      SELECT job.id
      FROM whatsapp_bot_jobs AS job
      WHERE job.status = 'queued'
        AND job.available_at <= now()
        AND NOT EXISTS (
          SELECT 1
          FROM whatsapp_bot_jobs AS earlier
          WHERE earlier.user_id = job.user_id
            AND earlier.status IN ('queued', 'processing')
            AND earlier.sequence < job.sequence
        )
      ORDER BY job.sequence
      FOR UPDATE OF job SKIP LOCKED
      LIMIT ${capped}
    )
    UPDATE whatsapp_bot_jobs AS job
    SET status = 'processing',
        attempts = job.attempts + 1,
        locked_at = now(),
        last_error = NULL,
        updated_at = now()
    FROM candidates
    WHERE job.id = candidates.id
    RETURNING job.id
  `);

  const ids = claimed.map((row) => row.id);
  if (ids.length === 0) {
    return [];
  }

  const rows = await db
    .select()
    .from(whatsappBotJobs)
    .where(inArray(whatsappBotJobs.id, ids));
  const byId = new Map(rows.map((row) => [row.id, row]));

  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
}

export async function markWhatsAppBotJobCompleted(
  jobId: string
): Promise<void> {
  await db
    .update(whatsappBotJobs)
    .set({
      status: "completed",
      lockedAt: null,
      processedAt: new Date(),
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(whatsappBotJobs.id, jobId));
}

export async function retryOrFailWhatsAppBotJob(options: {
  job: WhatsAppBotJob;
  error: string;
  maxAttempts: number;
  retryAt: Date;
}): Promise<void> {
  const failed = options.job.attempts >= options.maxAttempts;

  await db
    .update(whatsappBotJobs)
    .set({
      status: failed ? "failed" : "queued",
      availableAt: failed ? options.job.availableAt : options.retryAt,
      lockedAt: null,
      processedAt: failed ? new Date() : null,
      lastError: options.error.slice(0, 2000),
      updatedAt: new Date(),
    })
    .where(eq(whatsappBotJobs.id, options.job.id));
}
