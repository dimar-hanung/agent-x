import type { WhatsAppInboxEvent } from "@/lib/db/schema";
import {
  getWhatsAppInboxWorkerBatchSize,
  getWhatsAppInboxWorkerConcurrency,
  getWhatsAppInboxWorkerLockTimeoutMs,
  getWhatsAppInboxWorkerMaxAttempts,
  getWhatsAppInboxWorkerRetryBaseMs,
  getWhatsAppInboxWorkerRetryMaxMs,
} from "@/lib/integrations/whatsapp-inbox/config";
import {
  claimWhatsAppInboxEvents,
  markWhatsAppInboxEventCompleted,
  markWhatsAppInboxEventDeferred,
  requeueStaleWhatsAppInboxEvents,
  retryOrFailWhatsAppInboxEvent,
} from "@/lib/integrations/whatsapp-inbox/ingest/event-repository";
import { ingestWhatsAppMessage } from "@/lib/integrations/whatsapp-inbox/ingest/service";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function retryDelayMs(attempts: number): number {
  const base = getWhatsAppInboxWorkerRetryBaseMs();
  const maximum = getWhatsAppInboxWorkerRetryMaxMs();
  return Math.min(base * 2 ** Math.max(attempts - 1, 0), maximum);
}

async function processEvent(event: WhatsAppInboxEvent): Promise<void> {
  try {
    if (event.messageType !== "text") {
      await markWhatsAppInboxEventDeferred(event.id);
      return;
    }

    await ingestWhatsAppMessage({
      userId: event.userId,
      eventSequence: event.sequence,
      message: {
        remoteJid: event.remoteJid,
        chatType: event.chatType as "dm" | "group",
        senderJid: event.senderJid ?? undefined,
        senderName: event.senderName ?? undefined,
        direction: event.direction as "inbound" | "outbound",
        messageType: "text",
        text: event.text,
        messageId: event.waMessageId,
        sentAt: event.sentAt,
        fromMe: event.direction === "outbound",
        isGroup: event.chatType === "group",
      },
    });

    await markWhatsAppInboxEventCompleted(event.id);
  } catch (error) {
    const delay = retryDelayMs(event.attempts);
    await retryOrFailWhatsAppInboxEvent({
      event,
      error: errorMessage(error),
      maxAttempts: getWhatsAppInboxWorkerMaxAttempts(),
      retryAt: new Date(Date.now() + delay),
    });
  }
}

async function processWithConcurrency(
  events: WhatsAppInboxEvent[],
  concurrency: number
): Promise<void> {
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, events.length) },
    async () => {
      while (cursor < events.length) {
        const event = events[cursor];
        cursor += 1;
        if (event) {
          await processEvent(event);
        }
      }
    }
  );

  await Promise.all(workers);
}

export async function runWhatsAppInboxWorkerOnce(): Promise<{
  recovered: number;
  claimed: number;
}> {
  const lockTimeout = getWhatsAppInboxWorkerLockTimeoutMs();
  const recovered = await requeueStaleWhatsAppInboxEvents(
    new Date(Date.now() - lockTimeout)
  );
  const events = await claimWhatsAppInboxEvents(
    getWhatsAppInboxWorkerBatchSize()
  );

  if (events.length > 0) {
    await processWithConcurrency(
      events,
      getWhatsAppInboxWorkerConcurrency()
    );
  }

  return { recovered, claimed: events.length };
}