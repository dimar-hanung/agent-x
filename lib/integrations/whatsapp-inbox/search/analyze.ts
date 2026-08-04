import { generateText } from "ai";

import { getSummarizeModelInstance } from "@/lib/ai/context/resolve-summarize-model";
import {
  getWhatsAppSearchAiChunkSize,
  getWhatsAppSearchMaxCharsPerChat,
  getWhatsAppSearchMaxMessagesPerChat,
} from "@/lib/integrations/whatsapp-inbox/config";

import { generateNextSearchKeyword } from "./keyword-generation";
import { runWhatsAppMessageSearch } from "./orchestrate";
import { buildSearchAnalysisChunkPrompt } from "./prompt";
import {
  groupSearchHitsByChat,
  type WhatsAppMessageSearchHit,
  type WhatsAppSearchChatGroup,
} from "./service";

const ANALYSIS_OUTPUT_TOKENS = 6000;

/**
 * Bound the prompt size per chat so a broad keyword (matching thousands of
 * rows) cannot build an enormous analysis prompt that stalls the LLM call.
 * Keeps the newest messages and truncates the per-chat transcript by chars.
 */
function capChatGroupForPrompt(group: WhatsAppSearchChatGroup): {
  chatName: string;
  chatType: "dm" | "group";
  messages: WhatsAppMessageSearchHit[];
} {
  const maxMessages = getWhatsAppSearchMaxMessagesPerChat();
  const maxChars = getWhatsAppSearchMaxCharsPerChat();

  const capped: WhatsAppMessageSearchHit[] = [];
  let usedChars = 0;

  for (const message of group.messages.slice(0, maxMessages)) {
    const remaining = maxChars - usedChars;
    if (remaining <= 0) {
      break;
    }

    const text =
      message.text.length > remaining
        ? `${message.text.slice(0, remaining)}…`
        : message.text;
    usedChars += text.length;
    capped.push({ ...message, text });
  }

  return {
    chatName: group.chatName,
    chatType: group.chatType as "dm" | "group",
    messages: capped.length > 0 ? capped : group.messages.slice(0, 1),
  };
}

async function generateAnalysisText(options: {
  prompt: string;
  abortSignal?: AbortSignal;
}): Promise<string> {
  const result = await generateText({
    model: await getSummarizeModelInstance(),
    prompt: options.prompt,
    maxOutputTokens: ANALYSIS_OUTPUT_TOKENS,
    abortSignal: options.abortSignal,
    reasoning: "none",
  });

  const visibleText = (result.text ?? "").trim();
  const reasoningText = (result.reasoningText ?? "").trim();
  return visibleText || reasoningText;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export interface AnalyzeWhatsAppSearchInput {
  query: string;
  results: WhatsAppMessageSearchHit[];
  attemptedKeywords: string[];
  abortSignal?: AbortSignal;
}

export interface AnalyzeWhatsAppSearchResult {
  analysisText: string;
  chatCount: number;
  chunkCount: number;
  messageCount: number;
}

export async function analyzeWhatsAppSearch(
  input: AnalyzeWhatsAppSearchInput
): Promise<AnalyzeWhatsAppSearchResult | { success: false; message: string }> {
  if (input.results.length === 0) {
    return {
      success: false,
      message: "Tidak ada pesan yang cocok.",
    };
  }

  const chatGroups = groupSearchHitsByChat(input.results);
  const chunkSize = getWhatsAppSearchAiChunkSize();
  const chunks = chunkArray(chatGroups, chunkSize);
  const chunkTexts: string[] = [];

  for (let index = 0; index < chunks.length; index += 1) {
    if (input.abortSignal?.aborted) {
      return {
        success: false,
        message: "Analisis pencarian dibatalkan.",
      };
    }

    const chunk = chunks[index]!;
    const text = await generateAnalysisText({
      prompt: buildSearchAnalysisChunkPrompt(
        input.query,
        input.attemptedKeywords,
        chunk.map(capChatGroupForPrompt),
        {
          chunkIndex: index + 1,
          chunkCount: chunks.length,
          maxTokens: ANALYSIS_OUTPUT_TOKENS,
        }
      ),
      abortSignal: input.abortSignal,
    });

    if (!text) {
      return {
        success: false,
        message: "Model tidak menghasilkan analisis. Coba lagi.",
      };
    }

    chunkTexts.push(text);
  }

  const analysisText =
    chunkTexts.length === 1
      ? chunkTexts[0]!
      : chunkTexts
          .map((text, index) => {
            const start = index * chunkSize + 1;
            const end = Math.min((index + 1) * chunkSize, chatGroups.length);
            return `## Bagian ${index + 1} (chat ${start}–${end})\n\n${text}`;
          })
          .join("\n\n");

  if (!analysisText.trim()) {
    return {
      success: false,
      message: "Model tidak menghasilkan analisis. Coba lagi.",
    };
  }

  return {
    analysisText,
    chatCount: chatGroups.length,
    chunkCount: chunks.length,
    messageCount: input.results.length,
  };
}

export interface SearchAndAnalyzeWhatsAppMessagesInput {
  query: string;
  chatQuery?: string;
  since?: Date;
  abortSignal?: AbortSignal;
}

export type SearchAndAnalyzeWhatsAppMessagesResult =
  | {
      success: true;
      query: string;
      attemptedKeywords: string[];
      successfulKeywords: string[];
      results: WhatsAppMessageSearchHit[];
      analysisText: string;
      chatCount: number;
      chunkCount: number;
      messageCount: number;
      chatFilter: string | null;
    }
  | { success: false; message: string; attemptedKeywords: string[] };

export async function searchAndAnalyzeWhatsAppMessages(
  userId: string,
  input: SearchAndAnalyzeWhatsAppMessagesInput
): Promise<SearchAndAnalyzeWhatsAppMessagesResult> {
  const searchResult = await runWhatsAppMessageSearch(userId, {
    query: input.query,
    chatQuery: input.chatQuery,
    since: input.since,
    abortSignal: input.abortSignal,
  });

  if (!searchResult.success) {
    return {
      success: false,
      message: searchResult.message,
      attemptedKeywords: searchResult.attemptedKeywords,
    };
  }

  const analysis = await analyzeWhatsAppSearch({
    query: searchResult.query,
    results: searchResult.results,
    attemptedKeywords: searchResult.attemptedKeywords,
    abortSignal: input.abortSignal,
  });

  if ("success" in analysis) {
    return {
      success: false,
      message: analysis.message,
      attemptedKeywords: searchResult.attemptedKeywords,
    };
  }

  return {
    success: true,
    query: searchResult.query,
    attemptedKeywords: searchResult.attemptedKeywords,
    successfulKeywords: searchResult.successfulKeywords,
    results: searchResult.results,
    analysisText: analysis.analysisText,
    chatCount: analysis.chatCount,
    chunkCount: analysis.chunkCount,
    messageCount: analysis.messageCount,
    chatFilter: searchResult.chatFilter,
  };
}

// Re-export for tests and orchestration consumers
export { generateNextSearchKeyword, runWhatsAppMessageSearch };
