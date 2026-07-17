import { isOpenRouterConfigured } from "@/lib/ai/openrouter";

const OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings";
const DEFAULT_EMBEDDING_MODEL = "openai/text-embedding-3-large";
export const EMBEDDING_DIMENSIONS = 3072;

const EMBED_BATCH_SIZE = 48;

export class EmbeddingsNotConfiguredError extends Error {
  constructor() {
    super("OpenRouter API key is not configured.");
    this.name = "EmbeddingsNotConfiguredError";
  }
}

export class EmbeddingsApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "EmbeddingsApiError";
    this.status = status;
  }
}

function getEmbeddingModelId(): string {
  return (
    process.env.OPENROUTER_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL
  );
}

async function embedBatch(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new EmbeddingsNotConfiguredError();
  }

  const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getEmbeddingModelId(),
      input: texts,
      encoding_format: "float",
    }),
  });

  if (!response.ok) {
    let message = `Embeddings API error (${response.status})`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body.error?.message) {
        message = body.error.message;
      }
    } catch {
      // keep default
    }
    throw new EmbeddingsApiError(response.status, message);
  }

  const data = (await response.json()) as {
    data?: Array<{ embedding: number[]; index: number }>;
  };

  const items = data.data ?? [];
  items.sort((a, b) => a.index - b.index);
  return items.map((item) => item.embedding);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!isOpenRouterConfigured()) {
    throw new EmbeddingsNotConfiguredError();
  }

  if (texts.length === 0) {
    return [];
  }

  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const embeddings = await embedBatch(batch);
    results.push(...embeddings);
  }

  return results;
}

export async function embedQuery(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  if (!embedding) {
    throw new EmbeddingsApiError(500, "Gagal membuat embedding pertanyaan.");
  }
  return embedding;
}

export function getEmbeddingModelLabel(): string {
  return getEmbeddingModelId();
}
