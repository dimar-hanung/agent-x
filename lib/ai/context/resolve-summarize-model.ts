import { createOpenRouter } from "@openrouter/ai-sdk-provider";

import {
  getResolvedSummarizeModelId,
  getResolvedTextModelId,
} from "@/lib/ai/context/context-config";
import { getChatModel } from "@/lib/ai/openrouter";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
});

export async function getSummarizeModelInstance() {
  const summarizeModelId = await getResolvedSummarizeModelId();
  const textModelId = await getResolvedTextModelId();

  if (summarizeModelId === textModelId) {
    return getChatModel(textModelId);
  }

  return openrouter.chat(summarizeModelId);
}
