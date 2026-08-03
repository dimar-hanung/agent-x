const DEFAULT_DOCLING_URL = "http://172.16.81.16:5001";

export function getDoclingServeUrl(): string {
  return process.env.DOCLING_SERVE_URL?.trim() || DEFAULT_DOCLING_URL;
}

export function getDoclingApiKey(): string | undefined {
  const key = process.env.DOCLING_SERVE_API_KEY?.trim();
  return key || undefined;
}

export function isDoclingConfigured(): boolean {
  return Boolean(getDoclingServeUrl());
}
