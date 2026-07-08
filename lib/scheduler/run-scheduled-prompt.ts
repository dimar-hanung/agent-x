import { getUserById } from "@/lib/auth/get-user-by-id";
import { processChannelMessage } from "@/lib/channel/process-channel-message";
import { getOrCreateMainChannel } from "@/lib/db/repositories/channel-repository";
import type { ScheduleKind } from "@/lib/db/repositories/schedule-repository";
import {
  getScheduledJobById,
  markJobRun,
  updateScheduledJobChatId,
} from "@/lib/db/repositories/schedule-repository";

const SCHEDULED_RUN_PREFIX =
  "Ini eksekusi terjadwal. Gunakan format WhatsApp, bukan Markdown. Jangan pakai link Markdown [teks](url), tulis URL langsung.\n\n";

export async function runScheduledPrompt(jobId: string): Promise<void> {
  const job = await getScheduledJobById(jobId);

  if (!job || job.status !== "active") {
    return;
  }

  const user = await getUserById(job.userId);

  if (!user) {
    await markJobRun({
      jobId,
      success: false,
      error: "User tidak ditemukan.",
      scheduleKind: job.scheduleKind as ScheduleKind,
    });
    return;
  }

  try {
    const chatId = await getOrCreateMainChannel(user.userId);
    await updateScheduledJobChatId(jobId, chatId);

    await processChannelMessage({
      userId: user.userId,
      text: `${SCHEDULED_RUN_PREFIX}${job.prompt}`,
      source: "scheduler",
      metadata: { jobId },
    });

    await markJobRun({
      jobId,
      success: true,
      scheduleKind: job.scheduleKind as ScheduleKind,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menjalankan jadwal.";

    await markJobRun({
      jobId,
      success: false,
      error: message,
      scheduleKind: job.scheduleKind as ScheduleKind,
    });

    throw error;
  }
}
