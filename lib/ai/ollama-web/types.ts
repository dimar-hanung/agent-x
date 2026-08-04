export interface OllamaWebSearchResult {
  title: string;
  url: string;
  content: string;
}

export interface OllamaWebSearchResponse {
  results: OllamaWebSearchResult[];
}

export interface OllamaWebFetchResponse {
  title?: string;
  content?: string;
  links?: string[];
}

export interface OllamaWebSource {
  title: string;
  url: string;
  snippet: string;
}

export interface OllamaWebPage {
  url: string;
  title?: string;
  text: string;
}

export function normalizeOllamaSearchResults(
  results: OllamaWebSearchResult[]
): OllamaWebSource[] {
  return results.map((result) => ({
    title: result.title ?? result.url,
    url: result.url,
    snippet: result.content?.slice(0, 300) ?? "",
  }));
}
