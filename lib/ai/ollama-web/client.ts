import { OLLAMA_WEB_API_BASE, getOllamaApiKey } from "./env";
import type {
  OllamaWebFetchResponse,
  OllamaWebPage,
  OllamaWebSearchResponse,
  OllamaWebSource,
} from "./types";
import { normalizeOllamaSearchResults } from "./types";

export class OllamaWebNotConfiguredError extends Error {
  constructor() {
    super("OLLAMA_API_KEY is not configured.");
    this.name = "OllamaWebNotConfiguredError";
  }
}

export class OllamaWebApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "OllamaWebApiError";
    this.status = status;
  }
}

async function ollamaWebFetch<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const apiKey = getOllamaApiKey();

  if (!apiKey) {
    throw new OllamaWebNotConfiguredError();
  }

  const response = await fetch(`${OLLAMA_WEB_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Ollama web API error (${response.status})`;

    try {
      const errorBody = (await response.json()) as { message?: string };
      if (errorBody.message) {
        message = errorBody.message;
      }
    } catch {
      // use default message
    }

    throw new OllamaWebApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}

function clampMaxResults(value: number | undefined): number {
  if (value === undefined) {
    return 10;
  }

  return Math.min(10, Math.max(1, value));
}

export async function searchOllamaWeb({
  query,
  maxResults,
}: {
  query: string;
  maxResults?: number;
}): Promise<{ query: string; sources: OllamaWebSource[] }> {
  const data = await ollamaWebFetch<OllamaWebSearchResponse>("/web_search", {
    query,
    max_results: clampMaxResults(maxResults),
  });

  return {
    query,
    sources: normalizeOllamaSearchResults(data.results ?? []),
  };
}

export async function fetchOllamaWebPages({
  urls,
  maxCharacters,
}: {
  urls: string[];
  maxCharacters?: number;
}): Promise<{ pages: OllamaWebPage[] }> {
  const pages: OllamaWebPage[] = [];

  for (const url of urls) {
    const data = await ollamaWebFetch<OllamaWebFetchResponse>("/web_fetch", {
      url,
    });

    let text = data.content ?? "";

    if (maxCharacters !== undefined && text.length > maxCharacters) {
      text = text.slice(0, maxCharacters);
    }

    pages.push({
      url,
      title: data.title,
      text,
    });
  }

  return { pages };
}
