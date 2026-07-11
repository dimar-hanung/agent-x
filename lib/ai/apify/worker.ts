import "@/lib/db/load-env";

import { runApifyWorkerOnce } from "./worker-service";

const POLL_INTERVAL_MS = Number(process.env.APIFY_WORKER_POLL_INTERVAL_MS ?? 15_000);
let isRunning = false;

async function tick(): Promise<void> {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    await runApifyWorkerOnce();
  } finally {
    isRunning = false;
  }
}

async function main(): Promise<void> {
  console.log(`[apify] worker started (poll ${POLL_INTERVAL_MS}ms)`);
  await tick();

  const interval = setInterval(() => {
    void tick().catch((error) => {
      console.error("[apify] worker tick failed:", error);
    });
  }, POLL_INTERVAL_MS);

  const shutdown = () => {
    console.log("[apify] shutting down...");
    clearInterval(interval);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main().catch((error) => {
  console.error("[apify] fatal error:", error);
  process.exit(1);
});