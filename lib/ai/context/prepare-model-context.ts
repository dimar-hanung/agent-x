import {
  CONTEXT_TARGET_TOKENS,
  CONTEXT_TOKEN_BUDGET,
  MIN_RECENT_PAIRS,
  SYSTEM_PROMPT_OVERHEAD,
} from "@/lib/ai/context/context-config";
import { estimateMessagesTokens } from "@/lib/ai/context/estimate-tokens";
import { fitContextToBudget } from "@/lib/ai/context/fit-context-to-budget";
import { summarizeMessages } from "@/lib/ai/context/summarize-messages";
import type { StoredChatMessage } from "@/lib/ai/context/types";
import { buildSystemPrompt } from "@/lib/ai/chat-config";
import type { UserContext } from "@/lib/ai/roles/types";
import {
  getChatContextMeta,
  updateChatContextSummary,
} from "@/lib/db/repositories/chat-repository";
import type { UIMessage } from "ai";

export interface PrepareModelContextInput {
  chatId: string;
  user: UserContext;
  allMessages: StoredChatMessage[];
}

export interface PrepareModelContextResult {
  systemPrompt: string;
  modelMessages: UIMessage[];
  estimatedTokens: number;
}

function shouldSummarize(unsummarized: StoredChatMessage[]): boolean {
  const protectedTail = unsummarized.slice(-MIN_RECENT_PAIRS);
  const toMeasure = unsummarized.slice(0, -MIN_RECENT_PAIRS);

  if (toMeasure.length === 0) {
    return false;
  }

  const tokens = estimateMessagesTokens(toMeasure) + SYSTEM_PROMPT_OVERHEAD;
  return tokens >= CONTEXT_TOKEN_BUDGET;
}

export async function prepareModelContext({
  chatId,
  user,
  allMessages,
}: PrepareModelContextInput): Promise<PrepareModelContextResult> {
  let contextMeta = await getChatContextMeta(chatId);

  if (!contextMeta) {
    throw new Error("Chat not found.");
  }

  const unsummarized = allMessages.filter(
    (message) => message.sequence > contextMeta!.summarizedUpToSequence
  );

  if (shouldSummarize(unsummarized)) {
    const toSummarize = unsummarized.slice(0, -MIN_RECENT_PAIRS);
    const recentTail = unsummarized.slice(-MIN_RECENT_PAIRS);
    const tailTokens = estimateMessagesTokens(recentTail);
    const summaryBudget = Math.max(
      500,
      CONTEXT_TARGET_TOKENS - SYSTEM_PROMPT_OVERHEAD - tailTokens
    );

    const newSummary = await summarizeMessages(
      contextMeta.contextSummary,
      toSummarize,
      { maxTokens: summaryBudget }
    );

    const lastSummarized = toSummarize[toSummarize.length - 1];

    if (lastSummarized) {
      await updateChatContextSummary(
        chatId,
        newSummary,
        lastSummarized.sequence
      );

      console.info(
        `[context] Summarized chat ${chatId}: ${toSummarize.length} messages → ~${summaryBudget} token budget`
      );

      contextMeta = {
        ...contextMeta,
        contextSummary: newSummary,
        summarizedUpToSequence: lastSummarized.sequence,
      };
    }
  }

  const baseSystemPrompt = buildSystemPrompt(user);

  return fitContextToBudget({
    systemPrompt: baseSystemPrompt,
    contextSummary: contextMeta.contextSummary,
    allMessages,
    summarizedUpToSequence: contextMeta.summarizedUpToSequence,
  });
}
