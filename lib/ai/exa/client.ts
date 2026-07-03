import { EXA_API_BASE, getExaApiKey } from "./env";
import type {
  ExaContentsResponse,
  ExaPage,
  ExaSearchResponse,
  ExaSource,
} from "./types";
import { normalizeSearchResults } from "./types";

export class ExaNotConfiguredError extends Error {
  constructor() {
    super("EXA_API_KEY is not configured.");
    this.name = "ExaNotConfiguredError";
  }
}

export class ExaApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ExaApiError";
    this.status = status;
  }
}

async function exaFetch<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const apiKey = getExaApiKey();

  if (!apiKey) {
    throw new ExaNotConfiguredError();
  }

  const response = await fetch(`${EXA_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = `Exa API error (${response.status})`;

    try {
      const errorBody = (await response.json()) as { message?: string };
      if (errorBody.message) {
        message = errorBody.message;
      }
    } catch {
      // use default message
    }

    throw new ExaApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}

export async function searchExa({
  query,
  numResults = 10,
}: {
  query: string;
  numResults?: number;
}): Promise<{ query: string; sources: ExaSource[] }> {
  const data = await exaFetch<ExaSearchResponse>("/search", {
    query,
    numResults,
    contents: { highlights: true },
  });

  return {
    query,
    sources: normalizeSearchResults(data.results ?? []),
  };
}

export async function fetchExaContents({
  urls,
  maxCharacters = 3000,
}: {
  urls: string[];
  maxCharacters?: number;
}): Promise<{ pages: ExaPage[] }> {
  const data = await exaFetch<ExaContentsResponse>("/contents", {
    urls,
    text: { maxCharacters },
  });

  const pages: ExaPage[] = (data.results ?? []).map((result) => ({
    url: result.url,
    title: result.title,
    text: result.text ?? "",
  }));

  return { pages };
}
