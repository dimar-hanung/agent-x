import type { UIMessage } from "ai";

/** Strip tool parts — keep only user/assistant text for summarization. */
export function stripMessagesForSummary(messages: UIMessage[]): string {
  const lines: string[] = [];

  for (const message of messages) {
    const textParts = message.parts
      .filter(
        (part): part is { type: "text"; text: string } =>
          part.type === "text" && typeof part.text === "string"
      )
      .map((part) => part.text.trim())
      .filter(Boolean);

    if (textParts.length === 0) {
      continue;
    }

    lines.push(`${message.role}: ${textParts.join("\n")}`);
  }

  return lines.join("\n\n");
}
