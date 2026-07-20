import type { ApifySocialPlatform } from "@/lib/db/schema";

export const APIFY_SOCIAL_ACTORS = {
  tiktok: "clockworks~tiktok-scraper",
  twitter: "api-ninja~x-twitter-advanced-search",
  threads: "igview-owner~threads-search-scraper",
} as const satisfies Record<ApifySocialPlatform, string>;

export const APIFY_SOCIAL_LABELS = {
  tiktok: "TikTok",
  twitter: "Twitter/X",
  threads: "Threads",
} as const satisfies Record<ApifySocialPlatform, string>;

export const APIFY_TERMINAL_RUN_STATUSES = [
  "SUCCEEDED",
  "FAILED",
  "TIMED-OUT",
  "ABORTED",
] as const;

export const APIFY_FAILED_RUN_STATUSES = [
  "FAILED",
  "TIMED-OUT",
  "ABORTED",
] as const;
