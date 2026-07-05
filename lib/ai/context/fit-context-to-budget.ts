import {
  CONTEXT_TARGET_TOKENS,
  SYSTEM_PROMPT_OVERHEAD,
} from "@/lib/ai/context/context-config";
import {
  estimateMessageTokens,
  estimateTextTokens,
} from "@/lib/ai/context/estimate-tokens";
import type { StoredChatMessage } from "@/lib/ai/context/types";
import type { UIMessage } from "ai";

export interface FitContextInput {
  systemPrompt: string;
  contextSummary: string | null;
  allMessages: StoredChatMessage[];
  summarizedUpToSequence: number;
  targetTokens?: number;
}

export interface FitContextResult {
  systemPrompt: string;
  modelMessages: UIMessage[];
  estimatedTokens: number;
}

export function fitContextToBudget({
  systemPrompt,
  contextSummary,
  allMessages,
  summarizedUpToSequence,
  targetTokens = CONTEXT_TARGET_TOKENS,
}: FitContextInput): FitContextResult {
  const summaryBlock = contextSummary
    ? `\n\n[Conversation summary]\n${contextSummary}`
    : "";
  const fullSystemPrompt = `${systemPrompt}${summaryBlock}`;

  const systemTokens =
    estimateTextTokens(fullSystemPrompt) + SYSTEM_PROMPT_OVERHEAD;

  let budget = targetTokens - systemTokens;
  if (budget < 200) {
    budget = 200;
  }

  const unsummarized = allMessages.filter(
    (message) => message.sequence > summarizedUpToSequence
  );

  const selected: StoredChatMessage[] = [];
  let used = 0;

  for (let index = unsummarized.length - 1; index >= 0; index -= 1) {
    const message = unsummarized[index];
    const cost = estimateMessageTokens(message);

    if (selected.length > 0 && used + cost > budget) {
      break;
    }

    selected.unshift(message);
    used += cost;
  }

  if (selected.length === 0 && unsummarized.length > 0) {
    selected.push(unsummarized[unsummarized.length - 1]);
    used = estimateMessageTokens(unsummarized[unsummarized.length - 1]);
  }

  const modelMessages: UIMessage[] = selected.map(
    ({ sequence: _sequence, ...message }) => message
  );

  return {
    systemPrompt: fullSystemPrompt,
    modelMessages,
    estimatedTokens: systemTokens + used,
  };
}
