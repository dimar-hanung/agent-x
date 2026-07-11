import { z } from "zod";

const tiktokSourceSchema = z.object({
  force_refresh: z
    .boolean()
    .optional()
    .describe("Set true to bypass previously collected data and request fresh results."),
  hashtags: z
    .array(z.string().min(1))
    .optional()
    .describe("TikTok hashtags without #. Example: ['ai', 'startup']"),
  profiles: z
    .array(z.string().min(1))
    .optional()
    .describe("TikTok usernames or user IDs to scrape."),
  search_queries: z
    .array(z.string().min(1))
    .optional()
    .describe("TikTok keyword/search queries. Put multiple topics in this array and call this tool once for one TikTok request."),
  post_urls: z
    .array(z.string().url())
    .optional()
    .describe("Direct TikTok video/post URLs."),
  results_per_page: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .describe("Number of videos per hashtag, profile, or search query. Default: 20."),
  profile_scrape_sections: z
    .array(z.enum(["videos", "reposts"]))
    .min(1)
    .optional()
    .describe("Profile sections to scrape. Default: ['videos']."),
  profile_sorting: z
    .enum(["latest", "popular", "oldest"])
    .optional()
    .describe("Profile video sorting. Default: latest."),
  search_section: z
    .enum(["top", "video", "user"])
    .optional()
    .describe("TikTok search section. Default: top."),
  video_search_sorting: z
    .enum(["MOST_RELEVANT", "MOST_LIKED", "LATEST"])
    .optional()
    .describe("Video search sorting. Only applies to video search."),
  video_search_date_filter: z
    .enum([
      "ALL_TIME",
      "PAST_24_HOURS",
      "PAST_WEEK",
      "PAST_MONTH",
      "LAST_3_MONTHS",
      "LAST_6_MONTHS",
    ])
    .optional()
    .describe("Video search date filter. Only applies to video search."),
  exclude_pinned_posts: z
    .boolean()
    .optional()
    .describe("Exclude pinned profile posts. Default: false."),
  oldest_post_date_unified: z
    .string()
    .optional()
    .describe("Profile date filter: scrape posts after/on this date or age in days."),
  newest_post_date: z
    .string()
    .optional()
    .describe("Profile date filter: scrape posts before/on this date."),
  least_diggs: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Scrape videos with at least this many hearts."),
  most_diggs: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Scrape videos with fewer than this many hearts."),
  comments_per_post: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Maximum comments extracted per post."),
  top_level_comments_per_post: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Maximum top-level comments extracted per post."),
  max_replies_per_comment: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Maximum replies extracted per comment."),
  proxy_country_code: z
    .string()
    .optional()
    .describe("Proxy country code for region-specific TikTok content. Default: None."),
  scrape_related_videos: z
    .boolean()
    .optional()
    .describe("Scrape related videos for direct post URLs. Default: false."),
});

export const fetchTikTokDataInputSchema = tiktokSourceSchema.superRefine(
  (data, ctx) => {
    const hasSource =
      (data.hashtags?.length ?? 0) > 0 ||
      (data.profiles?.length ?? 0) > 0 ||
      (data.search_queries?.length ?? 0) > 0 ||
      (data.post_urls?.length ?? 0) > 0;

    if (!hasSource) {
      ctx.addIssue({
        code: "custom",
        message:
          "Provide at least one TikTok source: hashtags, profiles, search_queries, or post_urls.",
      });
    }
  }
);

export type FetchTikTokDataInput = z.infer<typeof fetchTikTokDataInputSchema>;