import { generateText } from "ai";

import { getSummarizeModelInstance } from "@/lib/ai/context/resolve-summarize-model";
import { getWhatsAppSearchKeywordsPerAttempt } from "@/lib/integrations/whatsapp-inbox/config";

import { buildKeywordGenerationPrompt } from "./prompt";

export interface GenerateNextSearchKeywordsInput {
  query: string;
  attemptedKeywords: string[];
  chatQuery?: string;
  abortSignal?: AbortSignal;
}

function normalizeKeyword(raw: string): string {
  return raw
    .replace(/^\d+[\.\)]\s*/, "")
    .replace(/^[-*•]\s*/, "")
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseKeywordsFromModelOutput(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map(normalizeKeyword)
    .filter(Boolean);
}

function dedupeNewKeywords(
  keywords: string[],
  attemptedKeywords: string[]
): string[] {
  const attempted = new Set(
    attemptedKeywords.map((keyword) => keyword.toLowerCase())
  );
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const keyword of keywords) {
    const normalized = keyword.toLowerCase();
    if (attempted.has(normalized) || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    unique.push(keyword);
  }

  return unique;
}

export async function generateNextSearchKeywords(
  input: GenerateNextSearchKeywordsInput
): Promise<string[]> {
  const keywordsPerAttempt = getWhatsAppSearchKeywordsPerAttempt();
  const result = await generateText({
    model: await getSummarizeModelInstance(),
    prompt: buildKeywordGenerationPrompt({
      query: input.query,
      attemptedKeywords: input.attemptedKeywords,
      chatQuery: input.chatQuery,
      keywordsPerAttempt,
    }),
    maxOutputTokens: 256,
    abortSignal: input.abortSignal,
    reasoning: "none",
  });

  const visibleText = (result.text ?? "").trim();
  const reasoningText = (result.reasoningText ?? "").trim();
  const raw = visibleText || reasoningText;
  if (!raw) {
    return [];
  }

  return dedupeNewKeywords(
    parseKeywordsFromModelOutput(raw),
    input.attemptedKeywords
  ).slice(0, keywordsPerAttempt);
}
