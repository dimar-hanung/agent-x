function positiveIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  const parsed = raw ? Number(raw) : fallback;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getWhatsAppBotWorkerPollIntervalMs(): number {
  return positiveIntegerEnv("WHATSAPP_BOT_WORKER_POLL_INTERVAL_MS", 1_000);
}

export function getWhatsAppBotWorkerBatchSize(): number {
  return positiveIntegerEnv("WHATSAPP_BOT_WORKER_BATCH_SIZE", 10);
}

/** Bounded parallelism across different users; jobs for one user stay serial. */
export function getWhatsAppBotWorkerConcurrency(): number {
  return positiveIntegerEnv("WHATSAPP_BOT_WORKER_CONCURRENCY", 3);
}

export function getWhatsAppBotWorkerMaxAttempts(): number {
  return positiveIntegerEnv("WHATSAPP_BOT_WORKER_MAX_ATTEMPTS", 3);
}

/** A model+tools run can legitimately take minutes; keep the lock generous. */
export function getWhatsAppBotWorkerLockTimeoutMs(): number {
  return positiveIntegerEnv("WHATSAPP_BOT_WORKER_LOCK_TIMEOUT_MS", 300_000);
}

export function getWhatsAppBotWorkerRetryBaseMs(): number {
  return positiveIntegerEnv("WHATSAPP_BOT_WORKER_RETRY_BASE_MS", 2_000);
}

export function getWhatsAppBotWorkerRetryMaxMs(): number {
  return positiveIntegerEnv("WHATSAPP_BOT_WORKER_RETRY_MAX_MS", 60_000);
}
