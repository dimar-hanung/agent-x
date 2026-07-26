import { getValidMicrosoftAccessToken } from "@/lib/microsoft/token";

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

export async function graphFetch(
  userId: string,
  path: string,
  init?: RequestInit
): Promise<Response | null> {
  const accessToken = await getValidMicrosoftAccessToken(userId);

  if (!accessToken) {
    return null;
  }

  const url = path.startsWith("http") ? path : `${GRAPH_BASE_URL}${path}`;

  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });
}

export async function graphJson<T>(
  userId: string,
  path: string,
  init?: RequestInit
): Promise<T | null> {
  const response = await graphFetch(userId, path, init);

  if (!response) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      text || `Microsoft Graph request failed with status ${response.status}.`
    );
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}
