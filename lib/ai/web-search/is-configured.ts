import { isExaConfigured } from "@/lib/ai/exa/env";
import { isOllamaWebConfigured } from "@/lib/ai/ollama-web/env";
import type { WebSearchProviderId } from "@/lib/admin/model-settings/constants";

export function isWebSearchConfiguredForProvider(
  provider: WebSearchProviderId
): boolean {
  if (provider === "ollama") {
    return isOllamaWebConfigured();
  }

  return isExaConfigured();
}

export function getWebSearchMissingEnvKey(
  provider: WebSearchProviderId
): string {
  if (provider === "ollama") {
    return "OLLAMA_API_KEY";
  }

  return "EXA_API_KEY";
}
