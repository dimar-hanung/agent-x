import { clearDigestInFlight } from "@/lib/integrations/whatsapp-inbox/summary/service";

const DEDUP_TTL_MS = 5 * 60 * 1000;
const CONTENT_DEDUP_TTL_MS = 60 * 1000;

const processedMessageIds = new Map<string, number>();
const processedContentKeys = new Map<string, number>();

interface ActiveWhatsAppRun {
  controller: AbortController;
  task: Promise<unknown>;
}

const activeUserRuns = new Map<string, ActiveWhatsAppRun>();

function pruneExpired(store: Map<string, number>, now: number) {
  for (const [key, expiresAt] of store) {
    if (expiresAt <= now) {
      store.delete(key);
    }
  }
}

/** Returns true if this inbound message was already handled recently. */
export function isDuplicateWhatsAppInboundMessage(
  messageId: string | undefined
): boolean {
  if (!messageId) {
    return false;
  }

  const now = Date.now();
  pruneExpired(processedMessageIds, now);

  const key = messageId.trim();
  if (!key) {
    return false;
  }

  if (processedMessageIds.has(key)) {
    return true;
  }

  processedMessageIds.set(key, now + DEDUP_TTL_MS);
  return false;
}

/** Fallback dedup when Evolution retries with a new message id. */
export function isDuplicateWhatsAppInboundContent(
  senderPhoneE164: string,
  text: string
): boolean {
  const normalizedText = text.trim().toLowerCase();
  if (!senderPhoneE164 || !normalizedText) {
    return false;
  }

  const now = Date.now();
  pruneExpired(processedContentKeys, now);

  const key = `${senderPhoneE164}:${normalizedText}`;
  if (processedContentKeys.has(key)) {
    return true;
  }

  processedContentKeys.set(key, now + CONTENT_DEDUP_TTL_MS);
  return false;
}

/** Abort any in-flight run and start a new one for the same user. */
export async function withWhatsAppUserProcessingLock<T>(
  userId: string,
  fn: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const existing = activeUserRuns.get(userId);
  if (existing) {
    existing.controller.abort();
    clearDigestInFlight(userId);
  }

  const controller = new AbortController();
  const task = fn(controller.signal).finally(() => {
    const current = activeUserRuns.get(userId);
    if (current?.controller === controller) {
      activeUserRuns.delete(userId);
    }
  });

  activeUserRuns.set(userId, { controller, task });
  return task;
}

export function isWhatsAppUserProcessing(userId: string): boolean {
  return activeUserRuns.has(userId);
}
