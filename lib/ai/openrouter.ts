import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const DEFAULT_MODEL = "deepseek/deepseek-v4-pro";

function getModelId(): string {
  return process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
});

export function getChatModel() {
  if (!isOpenRouterConfigured()) {
    throw new Error("OpenRouter API key is not configured.");
  }

  return openrouter.chat(getModelId());
}
