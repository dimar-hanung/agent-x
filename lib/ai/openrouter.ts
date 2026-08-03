import {
  createOpenRouter,
  type OpenRouterChatSettings,
} from "@openrouter/ai-sdk-provider";

import {
  DEFAULT_TEXT_MODEL_ID,
  isOllamaModelId,
} from "@/lib/admin/model-settings/constants";
import { getOllamaChatModel, isOllamaConfigured } from "@/lib/ai/ollama";

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

export function isChatModelConfigured(modelId?: string): boolean {
  const resolvedModelId = modelId?.trim() || getEnvModelId();

  if (isOllamaModelId(resolvedModelId)) {
    return isOllamaConfigured();
  }

  return isOpenRouterConfigured();
}

export function getChatModel(
  modelId?: string,
  settings?: OpenRouterChatSettings
) {
  const resolvedModelId = modelId?.trim() || getEnvModelId();

  if (isOllamaModelId(resolvedModelId)) {
    return getOllamaChatModel(resolvedModelId);
  }

  if (!isOpenRouterConfigured()) {
    throw new Error("OpenRouter API key is not configured.");
  }

  return openrouter.chat(resolvedModelId, settings);
}

export function getEnvFallbackModelId(): string {
  return getEnvModelId();
}
