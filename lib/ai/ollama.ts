import { createOpenAI } from "@ai-sdk/openai";

const DEFAULT_OLLAMA_BASE_URL = "http://172.16.81.16:11434";

const OLLAMA_MODEL_REQUEST_OPTIONS: Record<string, Record<string, unknown>> = {
  "gemma4:12b-it-q4_K_M": {
    num_ctx: 4096,
  },
};

function createOllamaFetch(): typeof fetch {
  return async (input, init) => {
    if (!init?.body || typeof init.body !== "string") {
      return fetch(input, init);
    }

    try {
      const body = JSON.parse(init.body) as {
        model?: string;
        options?: Record<string, unknown>;
      };
      const modelOptions = body.model
        ? OLLAMA_MODEL_REQUEST_OPTIONS[body.model]
        : undefined;

      if (!modelOptions) {
        return fetch(input, init);
      }

      return fetch(input, {
        ...init,
        body: JSON.stringify({
          ...body,
          options: {
            ...body.options,
            ...modelOptions,
          },
        }),
      });
    } catch {
      return fetch(input, init);
    }
  };
}

export function getOllamaBaseUrl(): string {
  return process.env.OLLAMA_BASE_URL?.trim() || DEFAULT_OLLAMA_BASE_URL;
}

export function isOllamaConfigured(): boolean {
  return Boolean(getOllamaBaseUrl());
}

const ollama = createOpenAI({
  baseURL: `${getOllamaBaseUrl()}/v1`,
  apiKey: "ollama",
  fetch: createOllamaFetch(),
});

export function getOllamaChatModel(modelId: string) {
  const resolvedModelId = modelId.trim();
  if (!resolvedModelId) {
    throw new Error("Ollama model id is required.");
  }

  return ollama.chat(resolvedModelId);
}
