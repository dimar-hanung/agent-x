import { and, desc, eq, isNotNull, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { scheduledJobs, type ScheduledJob } from "@/lib/db/schema";
import {
  computeNextRunAt,
  type ParsedScheduleInput,
  validateScheduleInput,
} from "@/lib/scheduler/parse-schedule";
import { verifyChatOwnership } from "@/lib/db/repositories/chat-repository";

export type ScheduleKind = "cron" | "once";
export type ScheduleStatus = "active" | "paused" | "completed" | "cancelled";

export interface ScheduleSummary {
  id: string;
  title: string;
  prompt: string;
  scheduleKind: ScheduleKind;
  status: ScheduleStatus;
  cronExpression: string | null;
  runAt: Date | null;
  timezone: string;
  nextRunAt: Date | null;
  lastRunAt: Date | null;
  lastError: string | null;
  runCount: number;
  createdAt: Date;
}

export interface CreateScheduledJobInput {
  userId: string;
  chatId?: string | null;
  title: string;
  prompt: string;
  scheduleKind: ScheduleKind;
  cronExpression?: string | null;
  timezone?: string;
  runAt?: Date | null;
}

function toScheduleSummary(row: ScheduledJob): ScheduleSummary {
  return {
    id: row.id,
    title: row.title,
    prompt: row.prompt,
    scheduleKind: row.scheduleKind as ScheduleKind,
    status: row.status as ScheduleStatus,
    cronExpression: row.cronExpression,
    runAt: row.runAt,
    timezone: row.timezone,
    nextRunAt: row.nextRunAt,
    lastRunAt: row.lastRunAt,
    lastError: row.lastError,
    runCount: row.runCount,
    createdAt: row.createdAt,
  };
}

export async function createScheduledJob(
  input: CreateScheduledJobInput
): Promise<ScheduleSummary> {
  if (input.scheduleKind !== "cron") {
    throw new Error(
      "Otomatisasi hanya untuk jadwal berulang. Untuk pengingat sekali, buat todo dengan starts_at."
    );
  }

  if (input.chatId) {
    const ownsChat = await verifyChatOwnership(input.chatId, input.userId);

    if (!ownsChat) {
      throw new Error("Chat tidak ditemukan.");
    }
  }

  const parsed: ParsedScheduleInput = validateScheduleInput({
    scheduleKind: input.scheduleKind,
    cronExpression: input.cronExpression,
    timezone: input.timezone,
    runAt: input.runAt,
  });

  const nextRunAt = computeNextRunAt(parsed);

  const [row] = await db
    .insert(scheduledJobs)
    .values({
      userId: input.userId,
      chatId: input.chatId ?? null,
      title: input.title.trim(),
      prompt: input.prompt.trim(),
      scheduleKind: parsed.scheduleKind,
      cronExpression: parsed.cronExpression,
      timezone: parsed.timezone,
      runAt: parsed.runAt,
      nextRunAt,
      status: "active",
    })
    .returning();

  return toScheduleSummary(row);
}

export async function listScheduledJobsForUser(
  userId: string,
  options?: { status?: ScheduleStatus; scheduleKind?: ScheduleKind }
): Promise<ScheduleSummary[]> {
  const conditions = [eq(scheduledJobs.userId, userId)];

  if (options?.status) {
    conditions.push(eq(scheduledJobs.status, options.status));
  }

  if (options?.scheduleKind) {
    conditions.push(eq(scheduledJobs.scheduleKind, options.scheduleKind));
  }

  const rows = await db
    .select()
    .from(scheduledJobs)
    .where(and(...conditions))
    .orderBy(desc(scheduledJobs.createdAt));

  return rows.map(toScheduleSummary);
}

export async function listActiveSchedulesForUser(
  userId: string
): Promise<ScheduleSummary[]> {
  return listScheduledJobsForUser(userId, {
    status: "active",
    scheduleKind: "cron",
  });
}

export interface ScheduleWatchItem {
  id: string;
  title: string;
  status: ScheduleStatus;
  scheduleKind: ScheduleKind;
  runCount: number;
  lastRunAt: Date | null;
  nextRunAt: Date | null;
  chatId: string | null;
  lastError: string | null;
}

export async function listScheduleWatchStateForUser(
  userId: string
): Promise<ScheduleWatchItem[]> {
  const rows = await db
    .select({
      id: scheduledJobs.id,
      title: scheduledJobs.title,
      status: scheduledJobs.status,
      scheduleKind: scheduledJobs.scheduleKind,
      runCount: scheduledJobs.runCount,
      lastRunAt: scheduledJobs.lastRunAt,
      nextRunAt: scheduledJobs.nextRunAt,
      chatId: scheduledJobs.chatId,
      lastError: scheduledJobs.lastError,
    })
    .from(scheduledJobs)
    .where(
      and(
        eq(scheduledJobs.userId, userId),
        or(
          eq(scheduledJobs.status, "active"),
          isNotNull(scheduledJobs.lastRunAt)
        )
      )
    )
    .orderBy(desc(scheduledJobs.updatedAt))
    .limit(30);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status as ScheduleStatus,
    scheduleKind: row.scheduleKind as ScheduleKind,
    runCount: row.runCount,
    lastRunAt: row.lastRunAt,
    nextRunAt: row.nextRunAt,
    chatId: row.chatId,
    lastError: row.lastError,
  }));
}

export async function getScheduledJobById(
  jobId: string
): Promise<ScheduledJob | null> {
  const [row] = await db
    .select()
    .from(scheduledJobs)
    .where(eq(scheduledJobs.id, jobId))
    .limit(1);

  return row ?? null;
}

export async function cancelScheduledJob(
  jobId: string,
  userId: string
): Promise<boolean> {
  const [row] = await db
    .update(scheduledJobs)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(
      and(
        eq(scheduledJobs.id, jobId),
        eq(scheduledJobs.userId, userId),
        or(
          eq(scheduledJobs.status, "active"),
          eq(scheduledJobs.status, "paused")
        )
      )
    )
    .returning({ id: scheduledJobs.id });

  return Boolean(row);
}

export async function pauseScheduledJob(
  jobId: string,
  userId: string
): Promise<ScheduleSummary | null> {
  const [row] = await db
    .update(scheduledJobs)
    .set({ status: "paused", updatedAt: new Date() })
    .where(
      and(
        eq(scheduledJobs.id, jobId),
        eq(scheduledJobs.userId, userId),
        eq(scheduledJobs.status, "active")
      )
    )
    .returning();

  return row ? toScheduleSummary(row) : null;
}

export async function resumeScheduledJob(
  jobId: string,
  userId: string
): Promise<ScheduleSummary | null> {
  const [existing] = await db
    .select()
    .from(scheduledJobs)
    .where(
      and(
        eq(scheduledJobs.id, jobId),
        eq(scheduledJobs.userId, userId),
        eq(scheduledJobs.status, "paused")
      )
    )
    .limit(1);

  if (!existing) {
    return null;
  }

  const now = new Date();
  let nextRunAt = existing.nextRunAt;

  if (existing.scheduleKind === "cron" && existing.cronExpression) {
    nextRunAt = computeNextRunAt({
      scheduleKind: "cron",
      cronExpression: existing.cronExpression,
      timezone: existing.timezone,
      runAt: null,
      fromDate: now,
    });
  } else if (existing.scheduleKind === "once") {
    nextRunAt = existing.runAt;
    if (nextRunAt && nextRunAt.getTime() <= now.getTime()) {
      throw new Error(
        "Waktu otomatisasi sekali sudah lewat. Batalkan dan buat baru."
      );
    }
  }

  const [row] = await db
    .update(scheduledJobs)
    .set({
      status: "active",
      nextRunAt,
      updatedAt: now,
    })
    .where(
      and(
        eq(scheduledJobs.id, jobId),
        eq(scheduledJobs.userId, userId),
        eq(scheduledJobs.status, "paused")
      )
    )
    .returning();

  return row ? toScheduleSummary(row) : null;
}

export async function listActiveJobsForWorker(): Promise<ScheduledJob[]> {
  return db
    .select()
    .from(scheduledJobs)
    .where(eq(scheduledJobs.status, "active"))
    .orderBy(scheduledJobs.updatedAt);
}

export async function updateScheduledJobChatId(
  jobId: string,
  chatId: string
): Promise<void> {
  await db
    .update(scheduledJobs)
    .set({ chatId, updatedAt: new Date() })
    .where(eq(scheduledJobs.id, jobId));
}

export async function claimJobForExecution(
  jobId: string
): Promise<ScheduledJob | null> {
  const [row] = await db
    .select()
    .from(scheduledJobs)
    .where(and(eq(scheduledJobs.id, jobId), eq(scheduledJobs.status, "active")))
    .limit(1);

  return row ?? null;
}

export async function markJobRun({
  jobId,
  success,
  error,
  scheduleKind,
}: {
  jobId: string;
  success: boolean;
  error?: string;
  scheduleKind: ScheduleKind;
}): Promise<void> {
  const job = await getScheduledJobById(jobId);

  if (!job) {
    return;
  }

  const now = new Date();
  const nextStatus: ScheduleStatus =
    success && scheduleKind === "once" ? "completed" : job.status as ScheduleStatus;

  let nextRunAt = job.nextRunAt;

  if (success && scheduleKind === "cron") {
    nextRunAt = computeNextRunAt({
      scheduleKind: "cron",
      cronExpression: job.cronExpression!,
      timezone: job.timezone,
      runAt: null,
      fromDate: now,
    });
  }

  if (scheduleKind === "once") {
    nextRunAt = null;
  }

  await db
    .update(scheduledJobs)
    .set({
      lastRunAt: now,
      runCount: job.runCount + 1,
      lastError: success ? null : (error ?? "Terjadi kesalahan."),
      status: success ? nextStatus : job.status,
      nextRunAt,
      updatedAt: now,
    })
    .where(eq(scheduledJobs.id, jobId));
}

export async function touchScheduledJob(jobId: string): Promise<void> {
  await db
    .update(scheduledJobs)
    .set({ updatedAt: new Date() })
    .where(eq(scheduledJobs.id, jobId));
}

export async function verifyScheduleOwnership(
  jobId: string,
  userId: string
): Promise<boolean> {
  const [row] = await db
    .select({ userId: scheduledJobs.userId })
    .from(scheduledJobs)
    .where(eq(scheduledJobs.id, jobId))
    .limit(1);

  return row?.userId === userId;
}
