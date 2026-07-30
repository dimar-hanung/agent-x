import type { UIMessage } from "ai";

const CHARS_PER_TOKEN = 4;

export function estimateTextTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

const IMAGE_PART_TOKEN_ESTIMATE = 512;

function extractMessageText(message: UIMessage): string {
  const parts: string[] = [];

  for (const part of message.parts) {
    if (part.type === "text" && typeof part.text === "string") {
      parts.push(part.text);
    }

    if (part.type === "file" && typeof part.filename === "string") {
      parts.push(`[file: ${part.filename}]`);
    }
  }

  return parts.join("\n");
}

export function estimateMessageTokens(message: UIMessage): number {
  let tokens = estimateTextTokens(extractMessageText(message)) + 8;

  for (const part of message.parts) {
    if (part.type === "file" && part.mediaType.startsWith("image/")) {
      tokens += IMAGE_PART_TOKEN_ESTIMATE;
    }
  }

  return tokens;
}

export function estimateMessagesTokens(messages: UIMessage[]): number {
  return messages.reduce((sum, message) => sum + estimateMessageTokens(message), 0);
}
