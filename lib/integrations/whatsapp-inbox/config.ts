const DAY_MS = 24 * 60 * 60 * 1000;

export function getWhatsAppBackfillDays(): number {
  const raw = process.env.WHATSAPP_BACKFILL_DAYS?.trim();
  const parsed = raw ? Number(raw) : 7;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
}

export function getWhatsAppBackfillMaxMessagesPerChat(): number {
  const raw = process.env.WHATSAPP_BACKFILL_MAX_MESSAGES?.trim();
  const parsed = raw ? Number(raw) : 200;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 200;
}

export function getWhatsAppBackfillMaxChats(): number {
  const raw = process.env.WHATSAPP_BACKFILL_MAX_CHATS?.trim();
  const parsed = raw ? Number(raw) : 50;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
}

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
