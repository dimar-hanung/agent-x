import "@/lib/db/load-env";

import { getWhatsAppBotWorkerPollIntervalMs } from "@/lib/integrations/whatsapp/bot-queue/config";
import { runWhatsAppBotWorkerOnce } from "@/lib/integrations/whatsapp/bot-queue/worker-service";

const pollIntervalMs = getWhatsAppBotWorkerPollIntervalMs();
let running = false;

async function tick(): Promise<void> {
  if (running) {
    return;
  }

  running = true;
  try {
    const result = await runWhatsAppBotWorkerOnce();
    if (result.claimed > 0 || result.recovered > 0) {
      console.log(
        `[whatsapp-bot] claimed=${result.claimed} recovered=${result.recovered}`
      );
    }
  } finally {
    running = false;
  }
}

async function main(): Promise<void> {
  console.log(`[whatsapp-bot] worker started (poll ${pollIntervalMs}ms)`);
  await tick();

  const interval = setInterval(() => {
    void tick().catch((error) => {
      console.error("[whatsapp-bot] worker tick failed:", error);
    });
  }, pollIntervalMs);

  const shutdown = () => {
    console.log("[whatsapp-bot] shutting down...");
    clearInterval(interval);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main().catch((error) => {
  console.error("[whatsapp-bot] fatal error:", error);
  process.exit(1);
});
