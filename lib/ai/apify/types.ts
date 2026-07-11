import type { ApifySocialPlatform } from "@/lib/db/schema";

export type JsonObject = Record<string, unknown>;

export interface PreparedApifyRequest {
  platform: ApifySocialPlatform;
  actorId: string;
  normalizedInput: JsonObject;
  actorInput: JsonObject;
  queryHash: string;
}

export interface ApifyPreviewItem {
  title?: string;
  text?: string;
  url?: string;
  author?: string;
  createdAt?: string;
  metrics?: Record<string, number>;
}

export type ApifyToolSource = "cache" | "queued" | "running";

export interface ApifyToolData {
  source: ApifyToolSource;
  platform: ApifySocialPlatform;
  preview: ApifyPreviewItem[];
  message: string;
}