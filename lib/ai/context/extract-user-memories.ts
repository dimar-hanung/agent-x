import { generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

import { getSummarizeModelId } from "@/lib/ai/context/context-config";
import { getChatModel } from "@/lib/ai/openrouter";
import { MEMORY_CONTENT_MAX_LENGTH } from "@/lib/db/schema";
import {
  createMemory,
  listMemories,
  normalizeMemoryContent,
} from "@/lib/memory/repository";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
});

function getExtractModel() {
  const modelId = getSummarizeModelId();
  const defaultModel = process.env.OPENROUTER_MODEL?.trim();

  if (defaultModel && modelId === defaultModel) {
    return getChatModel();
  }

  return openrouter.chat(modelId);
}

const extractedPreferencesSchema = z.array(
  z.string().trim().min(1).max(MEMORY_CONTENT_MAX_LENGTH)
);

function parsePreferencesJson(text: string): string[] {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    const parsed = JSON.parse(candidate);
    const result = extractedPreferencesSchema.safeParse(parsed);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

function buildExtractPrompt(
  summary: string,
  existing: Array<{ content: string }>
): string {
  const existingBlock =
    existing.length > 0
      ? existing.map((item) => `- ${item.content}`).join("\n")
      : "(none)";

  return `Extract NEW durable user preferences from this conversation summary.

Return ONLY a JSON array of short preference strings (max ${MEMORY_CONTENT_MAX_LENGTH} chars each).
Include lasting facts only: language, tone, timezone, name spelling, recurring constraints, stable personal facts the assistant should always know.
Do NOT include: tasks, todos, schedules, open questions, one-off requests, or temporary decisions.
Skip anything already listed in EXISTING MEMORIES (exact or near-duplicate meaning).
If nothing new, return [].

EXISTING MEMORIES:
${existingBlock}

CONVERSATION SUMMARY:
${summary}

JSON array:`;
}

export async function extractAndPersistUserMemories(
  userId: string,
  newSummary: string
): Promise<number> {
  const summary = newSummary.trim();

  if (!summary) {
    return 0;
  }

  const existing = await listMemories(userId);
  const existingNormalized = new Set(
    existing.map((item) => normalizeMemoryContent(item.content))
  );

  const { text } = await generateText({
    model: getExtractModel(),
    prompt: buildExtractPrompt(summary, existing),
  });

  const candidates = parsePreferencesJson(text);
  let created = 0;

  for (const candidate of candidates) {
    const normalized = normalizeMemoryContent(candidate);

    if (!normalized || existingNormalized.has(normalized)) {
      continue;
    }

    try {
      await createMemory(userId, {
        content: candidate,
        source: "summary",
      });
      existingNormalized.add(normalized);
      created += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "";

      if (
        message.includes("sudah tersimpan") ||
        message.includes("Memory penuh")
      ) {
        continue;
      }

      throw error;
    }
  }

  if (created > 0) {
    console.info(
      `[memory] Extracted ${created} preference(s) for user ${userId}`
    );
  }

  return created;
}
