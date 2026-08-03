import "@/lib/db/load-env";

import { runFilesIndexWorkerOnce } from "./worker-service";

const POLL_INTERVAL_MS = Number(
  process.env.FILES_INDEX_WORKER_POLL_INTERVAL_MS ?? 15_000
);
let isRunning = false;

async function tick(): Promise<void> {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    await runFilesIndexWorkerOnce();
  } finally {
    isRunning = false;
  }
}

async function main(): Promise<void> {
  console.log(`[files:index] worker started (poll ${POLL_INTERVAL_MS}ms)`);
  await tick();

  const interval = setInterval(() => {
    void tick().catch((error) => {
      console.error("[files:index] worker tick failed:", error);
    });
  }, POLL_INTERVAL_MS);

  const shutdown = () => {
    console.log("[files:index] shutting down...");
    clearInterval(interval);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main().catch((error) => {
  console.error("[files:index] fatal error:", error);
  process.exit(1);
});
