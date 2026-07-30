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

    const fileLabels = message.parts
      .filter((part) => part.type === "file")
      .map((part) => {
        if (part.type !== "file") {
          return "";
        }

        return `[file: ${part.filename ?? part.mediaType}]`;
      })
      .filter(Boolean);

    const combined = [...textParts, ...fileLabels];

    if (combined.length === 0) {
      continue;
    }

    lines.push(`${message.role}: ${combined.join("\n")}`);
  }

  return lines.join("\n\n");
}
