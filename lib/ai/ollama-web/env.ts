export const OLLAMA_WEB_API_BASE = "https://ollama.com/api";

export function getOllamaApiKey(): string | null {
  const key = process.env.OLLAMA_API_KEY?.trim();
  return key || null;
}

export function isOllamaWebConfigured(): boolean {
  return getOllamaApiKey() !== null;
}
