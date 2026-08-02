import {
  createOpenRouter,
  type OpenRouterChatSettings,
} from "@openrouter/ai-sdk-provider";

import { DEFAULT_TEXT_MODEL_ID } from "@/lib/admin/model-settings/constants";

const DEFAULT_MODEL = DEFAULT_TEXT_MODEL_ID;

function getEnvModelId(): string {
  return process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
});

export function getChatModel(
  modelId?: string,
  settings?: OpenRouterChatSettings
) {
  if (!isOpenRouterConfigured()) {
    throw new Error("OpenRouter API key is not configured.");
  }

  const resolvedModelId = modelId?.trim() || getEnvModelId();
  return openrouter.chat(resolvedModelId, settings);
}

export function getEnvFallbackModelId(): string {
  return getEnvModelId();
}
