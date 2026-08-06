export type WhatsAppSearchProgressEvent =
  | {
      type: "attempt";
      attempt: number;
      maxAttempts: number;
      keywords: string[];
      message: string;
    }
  | {
      type: "analyzing";
      message: string;
      messageCount: number;
    };

export type WhatsAppSearchProgressCallback = (
  event: WhatsAppSearchProgressEvent
) => void | Promise<void>;

const SEARCH_ATTEMPT_PREFIX = "Mencari dengan:";
const SEARCH_ANALYZING_MESSAGE = "Menganalisis pesan yang cocok…";

export function formatWhatsAppSearchAttemptMessage(
  keywords: string[],
  attempt: number,
  maxAttempts: number
): string {
  const list = keywords.join(", ");
  return `${SEARCH_ATTEMPT_PREFIX} ${list} (percobaan ${attempt}/${maxAttempts})`;
}

export function formatWhatsAppSearchAnalyzingMessage(): string {
  return SEARCH_ANALYZING_MESSAGE;
}

export function isWhatsAppSearchProgressMessage(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith(SEARCH_ATTEMPT_PREFIX) ||
    trimmed === SEARCH_ANALYZING_MESSAGE
  );
}
