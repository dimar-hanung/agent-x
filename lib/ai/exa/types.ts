export interface ExaSource {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
}

export interface ExaSearchResult {
  title?: string;
  url: string;
  publishedDate?: string;
  highlights?: string[];
  text?: string;
}

export interface ExaSearchResponse {
  results: ExaSearchResult[];
}

export interface ExaContentsResult {
  url: string;
  title?: string;
  text?: string;
}

export interface ExaContentsResponse {
  results: ExaContentsResult[];
}

export interface ExaPage {
  url: string;
  title?: string;
  text: string;
}

export function normalizeSearchResults(
  results: ExaSearchResult[]
): ExaSource[] {
  return results.map((result) => ({
    title: result.title ?? result.url,
    url: result.url,
    snippet:
      result.highlights?.join(" ") ??
      result.text?.slice(0, 300) ??
      "",
    publishedDate: result.publishedDate,
  }));
}
