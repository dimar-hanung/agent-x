import "./load-env";

import { cancelJob, gracefulShutdown, scheduleJob, type Job } from "node-schedule";

import { listActiveJobsForWorker } from "@/lib/db/repositories/schedule-repository";
import type { ScheduledJob } from "@/lib/db/schema";
import { buildNodeScheduleSpec } from "@/lib/scheduler/parse-schedule";
import { runScheduledPrompt } from "@/lib/scheduler/run-scheduled-prompt";

const POLL_INTERVAL_MS = Number(process.env.SCHEDULER_POLL_INTERVAL_MS ?? 15_000);

const registeredJobs = new Map<string, Job>();
const executingJobs = new Set<string>();
const registeredSpecs = new Map<string, string>();

function specKey(job: ScheduledJob): string {
  return JSON.stringify({
    kind: job.scheduleKind,
    cron: job.cronExpression,
    tz: job.timezone,
    runAt: job.runAt?.toISOString() ?? null,
  });
}

async function handleJobFire(jobId: string): Promise<void> {
  if (executingJobs.has(jobId)) {
    return;
  }

  executingJobs.add(jobId);

  try {
    await runScheduledPrompt(jobId);
  } catch (error) {
    console.error(`[scheduler] job ${jobId} failed:`, error);
  } finally {
    executingJobs.delete(jobId);
  }
}

function registerJob(job: ScheduledJob): void {
  const key = specKey(job);
  const existing = registeredJobs.get(job.id);

  if (existing && registeredSpecs.get(job.id) === key) {
    return;
  }

  if (existing) {
    cancelJob(existing);
    registeredJobs.delete(job.id);
    registeredSpecs.delete(job.id);
  }

  const spec = buildNodeScheduleSpec({
    scheduleKind: job.scheduleKind as "cron" | "once",
    cronExpression: job.cronExpression,
    timezone: job.timezone,
    runAt: job.runAt,
  });

  const scheduled = scheduleJob(job.id, spec, () => {
    void handleJobFire(job.id);
  });

  if (!scheduled) {
    console.error(`[scheduler] gagal mendaftarkan job ${job.id}`);
    return;
  }

  registeredJobs.set(job.id, scheduled);
  registeredSpecs.set(job.id, key);
}

function unregisterJob(jobId: string): void {
  const existing = registeredJobs.get(jobId);

  if (existing) {
    cancelJob(existing);
    registeredJobs.delete(jobId);
    registeredSpecs.delete(jobId);
  }
}

async function syncSchedules(): Promise<void> {
  const activeJobs = await listActiveJobsForWorker();
  const activeIds = new Set(activeJobs.map((job) => job.id));

  for (const jobId of registeredJobs.keys()) {
    if (!activeIds.has(jobId)) {
      unregisterJob(jobId);
    }
  }

  for (const job of activeJobs) {
    registerJob(job);
  }
}

async function main(): Promise<void> {
  console.log(`[scheduler] worker started (poll ${POLL_INTERVAL_MS}ms)`);

  await syncSchedules();

  const interval = setInterval(() => {
    void syncSchedules().catch((error) => {
      console.error("[scheduler] sync error:", error);
    });
  }, POLL_INTERVAL_MS);

  const shutdown = async () => {
    console.log("[scheduler] shutting down...");
    clearInterval(interval);

    for (const jobId of [...registeredJobs.keys()]) {
      unregisterJob(jobId);
    }

    await gracefulShutdown();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });

  process.on("SIGTERM", () => {
    void shutdown();
  });
}

void main().catch((error) => {
  console.error("[scheduler] fatal error:", error);
  process.exit(1);
});
