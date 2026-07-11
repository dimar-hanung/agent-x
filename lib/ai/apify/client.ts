import { getApifyApiBase, getApifyApiToken } from "./env";
import type { JsonObject } from "./types";

export class ApifyNotConfiguredError extends Error {
  constructor() {
    super("APIFY_API_TOKEN is not configured.");
    this.name = "ApifyNotConfiguredError";
  }
}

export class ApifyApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApifyApiError";
    this.status = status;
  }
}

export interface ApifyRun {
  id: string;
  status: string;
  defaultDatasetId?: string;
}

export interface ApifyClient {
  startActorRun(actorId: string, input: JsonObject): Promise<ApifyRun>;
  getActorRun(runId: string): Promise<ApifyRun>;
  getDatasetItems(datasetId: string): Promise<unknown[]>;
}

interface ApifyResponse<T> {
  data: T;
}

async function readErrorMessage(response: Response): Promise<string> {
  let message = `Apify API error (${response.status})`;

  try {
    const body = (await response.json()) as {
      error?: { message?: string };
      message?: string;
    };
    message = body.error?.message ?? body.message ?? message;
  } catch {
    // use default message
  }

  return message;
}

async function apifyFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getApifyApiToken();

  if (!token) {
    throw new ApifyNotConfiguredError();
  }

  const response = await fetch(`${getApifyApiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new ApifyApiError(response.status, await readErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

function actorPath(actorId: string): string {
  return encodeURIComponent(actorId.replace("/", "~"));
}

export async function startActorRun(
  actorId: string,
  input: JsonObject
): Promise<ApifyRun> {
  const response = await apifyFetch<ApifyResponse<ApifyRun>>(
    `/actors/${actorPath(actorId)}/runs`,
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );

  return response.data;
}

export async function getActorRun(runId: string): Promise<ApifyRun> {
  const response = await apifyFetch<ApifyResponse<ApifyRun>>(
    `/actor-runs/${encodeURIComponent(runId)}`
  );

  return response.data;
}

export async function getDatasetItems(datasetId: string): Promise<unknown[]> {
  const response = await apifyFetch<unknown[]>(
    `/datasets/${encodeURIComponent(datasetId)}/items?format=json&clean=true`
  );

  return Array.isArray(response) ? response : [];
}

export const defaultApifyClient: ApifyClient = {
  startActorRun,
  getActorRun,
  getDatasetItems,
};