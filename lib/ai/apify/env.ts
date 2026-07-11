export function getApifyApiBase(): string {
  return (
    process.env.APIFY_API_BASE?.trim().replace(/\/$/, "") ||
    "https://api.apify.com/v2"
  );
}

export function getApifyApiToken(): string | null {
  const token = process.env.APIFY_API_TOKEN?.trim();
  return token || null;
}

export function isApifyConfigured(): boolean {
  return getApifyApiToken() !== null;
}