import "@/lib/db/load-env";

import { getWhatsAppInboxWorkerPollIntervalMs } from "@/lib/integrations/whatsapp-inbox/config";
import { runWhatsAppInboxWorkerOnce } from "@/lib/integrations/whatsapp-inbox/ingest/worker-service";

const pollIntervalMs = getWhatsAppInboxWorkerPollIntervalMs();
let running = false;

async function tick(): Promise<void> {
  if (running) {
    return;
  }

  running = true;
  try {
    const result = await runWhatsAppInboxWorkerOnce();
    if (result.claimed > 0 || result.recovered > 0) {
      console.log(
        `[whatsapp-inbox] claimed=${result.claimed} recovered=${result.recovered}`
      );
    }
  } finally {
    running = false;
  }
}

async function main(): Promise<void> {
  console.log(`[whatsapp-inbox] worker started (poll ${pollIntervalMs}ms)`);
  await tick();

  const interval = setInterval(() => {
    void tick().catch((error) => {
      console.error("[whatsapp-inbox] worker tick failed:", error);
    });
  }, pollIntervalMs);

  const shutdown = () => {
    console.log("[whatsapp-inbox] shutting down...");
    clearInterval(interval);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main().catch((error) => {
  console.error("[whatsapp-inbox] fatal error:", error);
  process.exit(1);
});