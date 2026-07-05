import { generateText, type UIMessage } from "ai";

import { getSummarizeModelId } from "@/lib/ai/context/context-config";
import { stripMessagesForSummary } from "@/lib/ai/context/strip-messages-for-summary";
import { getChatModel } from "@/lib/ai/openrouter";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
});

function getSummarizeModel() {
  const modelId = getSummarizeModelId();
  const defaultModel = process.env.OPENROUTER_MODEL?.trim();

  if (defaultModel && modelId === defaultModel) {
    return getChatModel();
  }

  return openrouter.chat(modelId);
}

function buildSummarizePrompt(
  existingSummary: string | null,
  transcript: string,
  maxTokens: number
): string {
  const sections = [
    "user_preferences",
    "decisions",
    "tasks_scheduled",
    "open_questions",
    "key_facts",
  ].join(", ");

  if (existingSummary) {
    return `Update the rolling conversation summary by merging the existing summary with new messages.

Keep the summary under ${maxTokens} tokens.
Use these sections: ${sections}.
Preserve entities, names, dates, and decisions. Overwrite superseded information.

EXISTING SUMMARY:
${existingSummary}

NEW MESSAGES:
${transcript}

Return only the updated summary in the same structured format.`;
  }

  return `Summarize this conversation for long-term context.

Keep the summary under ${maxTokens} tokens.
Use these sections: ${sections}.
Preserve entities, names, dates, and decisions.

MESSAGES:
${transcript}

Return only the summary in structured format.`;
}

export async function summarizeMessages(
  existingSummary: string | null,
  messages: UIMessage[],
  options: { maxTokens: number }
): Promise<string> {
  const transcript = stripMessagesForSummary(messages);

  if (!transcript.trim()) {
    return existingSummary ?? "";
  }

  const { text } = await generateText({
    model: getSummarizeModel(),
    prompt: buildSummarizePrompt(existingSummary, transcript, options.maxTokens),
  });

  return text.trim();
}
