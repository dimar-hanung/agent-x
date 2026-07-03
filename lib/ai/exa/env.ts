export const EXA_API_BASE = "https://api.exa.ai";

export function getExaApiKey(): string | null {
  const key = process.env.EXA_API_KEY?.trim();
  return key || null;
}

export function isExaConfigured(): boolean {
  return getExaApiKey() !== null;
}
