import { processChannelMessage } from "@/lib/channel/process-channel-message";
import type { WhatsAppBotJob } from "@/lib/db/schema";
import {
  getWhatsAppBotWorkerBatchSize,
  getWhatsAppBotWorkerConcurrency,
  getWhatsAppBotWorkerLockTimeoutMs,
  getWhatsAppBotWorkerMaxAttempts,
  getWhatsAppBotWorkerRetryBaseMs,
  getWhatsAppBotWorkerRetryMaxMs,
} from "@/lib/integrations/whatsapp/bot-queue/config";
import {
  claimWhatsAppBotJobs,
  markWhatsAppBotJobCompleted,
  requeueStaleWhatsAppBotJobs,
  retryOrFailWhatsAppBotJob,
} from "@/lib/integrations/whatsapp/bot-queue/job-repository";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function retryDelayMs(attempts: number): number {
  const base = getWhatsAppBotWorkerRetryBaseMs();
  const maximum = getWhatsAppBotWorkerRetryMaxMs();
  return Math.min(base * 2 ** Math.max(attempts - 1, 0), maximum);
}

async function processJob(job: WhatsAppBotJob): Promise<void> {
  try {
    const inputMode = job.inputMode === "voice" ? "voice" : "text";

    await processChannelMessage({
      userId: job.userId,
      text: job.text,
      attachments: job.attachments ?? undefined,
      source: "whatsapp",
      replyViaWhatsApp: true,
      whatsappInputMode: inputMode,
      metadata: { messageId: job.waMessageId, inputMode },
    });

    await markWhatsAppBotJobCompleted(job.id);
  } catch (error) {
    const delay = retryDelayMs(job.attempts);
    await retryOrFailWhatsAppBotJob({
      job,
      error: errorMessage(error),
      maxAttempts: getWhatsAppBotWorkerMaxAttempts(),
      retryAt: new Date(Date.now() + delay),
    });
  }
}

async function processWithConcurrency(
  jobs: WhatsAppBotJob[],
  concurrency: number
): Promise<void> {
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, jobs.length) },
    async () => {
      while (cursor < jobs.length) {
        const job = jobs[cursor];
        cursor += 1;
        if (job) {
          await processJob(job);
        }
      }
    }
  );

  await Promise.all(workers);
}

export async function runWhatsAppBotWorkerOnce(): Promise<{
  recovered: number;
  claimed: number;
}> {
  const lockTimeout = getWhatsAppBotWorkerLockTimeoutMs();
  const recovered = await requeueStaleWhatsAppBotJobs(
    new Date(Date.now() - lockTimeout)
  );
  const jobs = await claimWhatsAppBotJobs(getWhatsAppBotWorkerBatchSize());

  if (jobs.length > 0) {
    await processWithConcurrency(jobs, getWhatsAppBotWorkerConcurrency());
  }

  return { recovered, claimed: jobs.length };
}
