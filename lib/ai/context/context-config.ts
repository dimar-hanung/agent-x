import { DEFAULT_TEXT_MODEL_ID } from "@/lib/admin/model-settings/constants";
import { getModelSettings } from "@/lib/admin/model-settings/repository";

export const CONTEXT_TOKEN_BUDGET = parseInt(
  process.env.CONTEXT_TOKEN_BUDGET ?? "200000",
  10
);

export const CONTEXT_TARGET_TOKENS = parseInt(
  process.env.CONTEXT_TARGET_TOKENS ?? "5000",
  10
);

export const SYSTEM_PROMPT_OVERHEAD = 800;

/** Minimum recent messages kept out of summarization (last user + assistant pair). */
export const MIN_RECENT_PAIRS = 2;

export function getSummarizeModelId(): string {
  return (
    process.env.CONTEXT_SUMMARIZE_MODEL?.trim() ||
    process.env.OPENROUTER_MODEL?.trim() ||
    DEFAULT_TEXT_MODEL_ID
  );
}

export async function getResolvedTextModelId(): Promise<string> {
  const settings = await getModelSettings();
  return settings.textModelId;
}

export async function getResolvedSummarizeModelId(): Promise<string> {
  return (
    process.env.CONTEXT_SUMMARIZE_MODEL?.trim() ||
    (await getResolvedTextModelId())
  );
}
