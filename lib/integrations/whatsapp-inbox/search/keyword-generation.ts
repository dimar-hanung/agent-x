import { generateText } from "ai";

import { getSummarizeModelInstance } from "@/lib/ai/context/resolve-summarize-model";

import { buildKeywordGenerationPrompt } from "./prompt";

export interface GenerateNextSearchKeywordInput {
  query: string;
  attemptedKeywords: string[];
  chatQuery?: string;
  abortSignal?: AbortSignal;
}

export async function generateNextSearchKeyword(
  input: GenerateNextSearchKeywordInput
): Promise<string | null> {
  const result = await generateText({
    model: await getSummarizeModelInstance(),
    prompt: buildKeywordGenerationPrompt({
      query: input.query,
      attemptedKeywords: input.attemptedKeywords,
      chatQuery: input.chatQuery,
    }),
    maxOutputTokens: 64,
    abortSignal: input.abortSignal,
    reasoning: "none",
  });

  const visibleText = (result.text ?? "").trim();
  const reasoningText = (result.reasoningText ?? "").trim();
  const raw = visibleText || reasoningText;
  if (!raw) {
    return null;
  }

  const keyword = raw
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!keyword) {
    return null;
  }

  const normalized = keyword.toLowerCase();
  if (
    input.attemptedKeywords.some(
      (attempted) => attempted.toLowerCase() === normalized
    )
  ) {
    return null;
  }

  return keyword;
}
