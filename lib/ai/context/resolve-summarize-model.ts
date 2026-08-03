import {
  getResolvedSummarizeModelId,
  getResolvedTextModelId,
} from "@/lib/ai/context/context-config";
import { getChatModel } from "@/lib/ai/openrouter";

export async function getSummarizeModelInstance() {
  const summarizeModelId = await getResolvedSummarizeModelId();
  const textModelId = await getResolvedTextModelId();

  if (summarizeModelId === textModelId) {
    return getChatModel(textModelId);
  }

  return getChatModel(summarizeModelId);
}
