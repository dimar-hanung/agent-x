const DAY_MS = 24 * 60 * 60 * 1000;

export function getDefaultDigestSince(): Date {
  return new Date(Date.now() - DAY_MS);
}

export function getWhatsAppDigestChunkSize(): number {
  const raw = process.env.WHATSAPP_DIGEST_CHUNK_SIZE?.trim();
  const parsed = raw ? Number(raw) : 100;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 100;
}

export function getWhatsAppDigestMaxMessagesPerChat(): number {
  const raw = process.env.WHATSAPP_DIGEST_MAX_MESSAGES_PER_CHAT?.trim();
  const parsed = raw ? Number(raw) : 40;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 40;
}

export function getWhatsAppDigestMaxCharsPerChat(): number {
  const raw = process.env.WHATSAPP_DIGEST_MAX_CHARS_PER_CHAT?.trim();
  const parsed = raw ? Number(raw) : 2500;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2500;
}

function positiveIntegerEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  const parsed = raw ? Number(raw) : fallback;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function getWhatsAppDigestCatchUpPollIntervalMs(): number {
  return positiveIntegerEnv("WHATSAPP_DIGEST_CATCH_UP_POLL_INTERVAL_MS", 1_000);
}
export function getWhatsAppInboxWorkerPollIntervalMs(): number {
  return positiveIntegerEnv("WHATSAPP_INBOX_WORKER_POLL_INTERVAL_MS", 1_000);
}

export function getWhatsAppInboxWorkerBatchSize(): number {
  return positiveIntegerEnv("WHATSAPP_INBOX_WORKER_BATCH_SIZE", 25);
}

export function getWhatsAppInboxWorkerConcurrency(): number {
  return positiveIntegerEnv("WHATSAPP_INBOX_WORKER_CONCURRENCY", 5);
}

export function getWhatsAppInboxWorkerMaxAttempts(): number {
  return positiveIntegerEnv("WHATSAPP_INBOX_WORKER_MAX_ATTEMPTS", 5);
}

export function getWhatsAppInboxWorkerLockTimeoutMs(): number {
  return positiveIntegerEnv("WHATSAPP_INBOX_WORKER_LOCK_TIMEOUT_MS", 300_000);
}

export function getWhatsAppInboxWorkerRetryBaseMs(): number {
  return positiveIntegerEnv("WHATSAPP_INBOX_WORKER_RETRY_BASE_MS", 1_000);
}

export function getWhatsAppInboxWorkerRetryMaxMs(): number {
  return positiveIntegerEnv("WHATSAPP_INBOX_WORKER_RETRY_MAX_MS", 60_000);
}

export function getWhatsAppSearchMaxKeywordAttempts(): number {
  return positiveIntegerEnv("WHATSAPP_SEARCH_MAX_KEYWORD_ATTEMPTS", 10);
}

export function getWhatsAppSearchKeywordsPerAttempt(): number {
  return positiveIntegerEnv("WHATSAPP_SEARCH_KEYWORDS_PER_ATTEMPT", 5);
}

export function getWhatsAppSearchAiChunkSize(): number {
  return positiveIntegerEnv("WHATSAPP_SEARCH_AI_CHUNK_SIZE", 500);
}

export function getWhatsAppSearchMaxRowsPerKeyword(): number {
  return positiveIntegerEnv("WHATSAPP_SEARCH_MAX_ROWS_PER_KEYWORD", 500);
}

export function getWhatsAppSearchMaxMessagesPerChat(): number {
  return positiveIntegerEnv("WHATSAPP_SEARCH_MAX_MESSAGES_PER_CHAT", 20);
}

export function getWhatsAppSearchMaxCharsPerChat(): number {
  return positiveIntegerEnv("WHATSAPP_SEARCH_MAX_CHARS_PER_CHAT", 2000);
}

export function getWhatsAppDirectorySyncPageSize(): number {
  return positiveIntegerEnv("WHATSAPP_DIRECTORY_SYNC_PAGE_SIZE", 500);
}
