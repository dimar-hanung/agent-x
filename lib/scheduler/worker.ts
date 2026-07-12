import "./load-env";

import { appendFileSync } from "node:fs";
import { cancelJob, gracefulShutdown, scheduleJob, type Job } from "node-schedule";

import { listActiveJobsForWorker } from "@/lib/db/repositories/schedule-repository";
import type { ScheduledJob } from "@/lib/db/schema";
import { buildNodeScheduleSpec } from "@/lib/scheduler/parse-schedule";
import { processDueTodoNotifications } from "@/lib/scheduler/process-todo-notifications";
import { runScheduledPrompt } from "@/lib/scheduler/run-scheduled-prompt";

const POLL_INTERVAL_MS = Number(process.env.SCHEDULER_POLL_INTERVAL_MS ?? 15_000);

const registeredJobs = new Map<string, Job>();
const executingJobs = new Set<string>();
const registeredSpecs = new Map<string, string>();

// #region agent log
function debugLog(payload: {
  hypothesisId: string;
  location: string;
  message: string;
  data?: Record<string, unknown>;
}) {
  const line = JSON.stringify({
    sessionId: "5803d0",
    runId: "post-fix",
    ...payload,
    timestamp: Date.now(),
  });
  try {
    appendFileSync(
      "/home/agent/htdocs/agent.serverlab.my.id/.cursor/debug-5803d0.log",
      `${line}\n`
    );
  } catch {
    /* ignore */
  }
  fetch("http://localhost:7290/ingest/dd2ac6a0-2684-40fc-8133-4176bd7c2469", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "5803d0",
    },
    body: line,
  }).catch(() => {});
}
// #endregion

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

  // #region agent log
  debugLog({
    hypothesisId: "A",
    location: "worker.ts:handleJobFire",
    message: "job fire start",
    data: { jobId },
  });
  // #endregion

  try {
    await runScheduledPrompt(jobId);
    // #region agent log
    debugLog({
      hypothesisId: "A",
      location: "worker.ts:handleJobFire",
      message: "job fire ok",
      data: { jobId },
    });
    // #endregion
  } catch (error) {
    // #region agent log
    debugLog({
      hypothesisId: "A",
      location: "worker.ts:handleJobFire",
      message: "job fire failed",
      data: {
        jobId,
        error: error instanceof Error ? error.message : String(error),
      },
    });
    // #endregion
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

  // #region agent log
  debugLog({
    hypothesisId: "A",
    location: "worker.ts:syncSchedules",
    message: "jobs registered, starting todo notify",
    data: {
      activeCount: activeJobs.length,
      registeredCount: registeredJobs.size,
    },
  });
  // #endregion

  try {
    await processDueTodoNotifications();
    // #region agent log
    debugLog({
      hypothesisId: "A",
      location: "worker.ts:syncSchedules",
      message: "todo notify ok",
      data: {},
    });
    // #endregion
  } catch (error) {
    // #region agent log
    debugLog({
      hypothesisId: "A",
      location: "worker.ts:syncSchedules",
      message: "todo notify crashed",
      data: {
        error: error instanceof Error ? error.message : String(error),
        cause:
          error instanceof Error && "cause" in error
            ? String((error as { cause?: unknown }).cause)
            : undefined,
      },
    });
    // #endregion
    // Keep cron jobs alive even if todo notify fails.
    console.error("[scheduler] todo notify error:", error);
  }
}

async function main(): Promise<void> {
  console.log(`[scheduler] worker started (poll ${POLL_INTERVAL_MS}ms)`);

  // #region agent log
  debugLog({
    hypothesisId: "A",
    location: "worker.ts:main",
    message: "worker main start",
    data: { pollMs: POLL_INTERVAL_MS },
  });
  // #endregion

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
