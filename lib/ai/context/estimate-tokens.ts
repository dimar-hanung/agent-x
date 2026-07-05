import type { UIMessage } from "ai";

const CHARS_PER_TOKEN = 4;

export function estimateTextTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function extractMessageText(message: UIMessage): string {
  const parts: string[] = [];

  for (const part of message.parts) {
    if (part.type === "text" && typeof part.text === "string") {
      parts.push(part.text);
    }
  }

  return parts.join("\n");
}

export function estimateMessageTokens(message: UIMessage): number {
  return estimateTextTokens(extractMessageText(message)) + 8;
}

export function estimateMessagesTokens(messages: UIMessage[]): number {
  return messages.reduce((sum, message) => sum + estimateMessageTokens(message), 0);
}
