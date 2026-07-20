import { z } from "zod";

const twitterLanguages = [
  "en",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "ru",
  "ja",
  "ko",
  "zh",
  "ar",
  "hi",
  "nl",
  "sv",
  "no",
  "da",
  "fi",
  "pl",
  "tr",
  "el",
  "iw",
  "th",
  "vi",
  "in",
  "ms",
  "tl",
] as const;

const mediaTypes = [
  "media",
  "images",
  "videos",
  "twimg",
  "native_video",
  "consumer_video",
  "pro_video",
  "vine",
  "periscope",
  "spaces",
] as const;

const tweetTypes = [
  "original",
  "retweets",
  "quotes",
  "replies",
  "self_threads",
] as const;

const pollTypes = [
  "poll2choice_text_only",
  "poll3choice_text_only",
  "poll4choice_text_only",
  "poll2choice_image",
  "poll3choice_image",
  "poll4choice_image",
] as const;

const cardNames = [
  "audio",
  "animated_gif",
  "player",
  "app",
  "promo_image_app",
  "summary",
  "summary_large_image",
  "promo_website",
  "promo_image_convo",
  "promo_video_convo",
  "moment",
] as const;

const dateSchema = z
  .string()
  .regex(
    /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
    "Use YYYY-MM-DD."
  );
const stringArray = z.array(z.string().min(1)).optional();
const nonNegativeInteger = z.number().int().min(0).optional();

const twitterSourceSchema = z.object({
  force_refresh: z
    .boolean()
    .optional()
    .describe("Set true to bypass previously collected data and request fresh results."),
  query: z
    .string()
    .min(1)
    .optional()
    .describe("X/Twitter advanced search query with supported search operators."),
  search_terms: z
    .array(z.string().min(1))
    .optional()
    .describe(
      "Topics to combine into one X/Twitter query with OR. Use one tool call for multiple topics."
    ),
  latest: z
    .boolean()
    .optional()
    .describe(
      "Set true for latest, recent, newest, current, or baru-baru ini topics. Applies the previous 7 days through today unless explicit time filters are supplied."
    ),
  number_of_tweets: z
    .number()
    .int()
    .min(20)
    .max(5000)
    .optional()
    .describe("Number of tweets to collect. Minimum: 20. Default: 100."),
  scrape_all: z
    .boolean()
    .optional()
    .describe("Collect all available tweets and ignore number_of_tweets."),
  engagement_level: z
    .enum(["none", "low", "medium", "high", "viral"])
    .optional(),
  engagement_min_retweets: nonNegativeInteger,
  engagement_max_retweets: nonNegativeInteger,
  engagement_min_likes: nonNegativeInteger,
  engagement_max_likes: nonNegativeInteger,
  engagement_min_replies: nonNegativeInteger,
  engagement_max_replies: nonNegativeInteger,
  engagement_has_engagement: z.boolean().optional(),
  media_types: z.array(z.enum(mediaTypes)).optional(),
  media_has_links: z.boolean().optional(),
  media_has_mentions: z.boolean().optional(),
  media_has_hashtags: z.boolean().optional(),
  media_news_only: z.boolean().optional(),
  media_safe_content_only: z.boolean().optional(),
  users_blue_verified_only: z.boolean().optional(),
  users_verified_only: z.boolean().optional(),
  users_from_users: stringArray.describe("Usernames without @."),
  users_to_users: stringArray.describe("Reply target usernames without @."),
  users_mention_users: stringArray.describe("Mentioned usernames without @."),
  users_exclude_from_users: stringArray.describe("Excluded usernames without @."),
  users_list_members: stringArray,
  content_language: z
    .enum(twitterLanguages)
    .optional()
    .describe(
      "Tweet language. Use 'in' for Indonesian. Only set when the user explicitly requests a source language."
    ),
  content_emoticons: z.enum(["positive", "negative"]).optional(),
  content_keywords: stringArray,
  content_exact_phrases: stringArray,
  content_exclude_keywords: stringArray,
  content_hashtags: stringArray.describe("Hashtags without #."),
  content_exclude_hashtags: stringArray.describe("Excluded hashtags without #."),
  content_cashtags: stringArray.describe("Stock symbols without $."),
  content_question_marks: z.boolean().optional(),
  tweet_types: z.array(z.enum(tweetTypes)).optional(),
  tweet_types_exclude: z.array(z.enum(tweetTypes)).optional(),
  tweet_conversation_id: z.string().min(1).optional(),
  tweet_quoted_tweet_id: z.string().min(1).optional(),
  tweet_quoted_user_id: z.string().min(1).optional(),
  tweet_poll_types: z.array(z.enum(pollTypes)).optional(),
  time_since: dateSchema.optional(),
  time_until: dateSchema.optional(),
  time_within_time: z
    .string()
    .regex(/^\d+\s*(d|h|m|s)$/, "Use values such as 2d, 3h, 5m, or 30s.")
    .optional(),
  time_since_unix: nonNegativeInteger,
  time_until_unix: nonNegativeInteger,
  time_since_id: z.string().min(1).optional(),
  time_max_id: z.string().min(1).optional(),
  geo_near: z.string().min(1).optional(),
  geo_within_radius: z.string().min(1).optional(),
  geo_geocode: z.string().min(1).optional(),
  geo_place_id: z.string().min(1).optional(),
  apps_sources: stringArray,
  apps_exclude_sources: stringArray,
  card_domain: z.string().min(1).optional(),
  card_url: z.string().min(1).optional(),
  card_name: z.enum(cardNames).optional(),
});

const twitterSearchFields = [
  "query",
  "search_terms",
  "engagement_level",
  "engagement_min_retweets",
  "engagement_max_retweets",
  "engagement_min_likes",
  "engagement_max_likes",
  "engagement_min_replies",
  "engagement_max_replies",
  "engagement_has_engagement",
  "media_types",
  "media_has_links",
  "media_has_mentions",
  "media_has_hashtags",
  "media_news_only",
  "media_safe_content_only",
  "users_blue_verified_only",
  "users_verified_only",
  "users_from_users",
  "users_to_users",
  "users_mention_users",
  "users_exclude_from_users",
  "users_list_members",
  "content_language",
  "content_emoticons",
  "content_keywords",
  "content_exact_phrases",
  "content_exclude_keywords",
  "content_hashtags",
  "content_exclude_hashtags",
  "content_cashtags",
  "content_question_marks",
  "tweet_types",
  "tweet_types_exclude",
  "tweet_conversation_id",
  "tweet_quoted_tweet_id",
  "tweet_quoted_user_id",
  "tweet_poll_types",
  "geo_near",
  "geo_within_radius",
  "geo_geocode",
  "geo_place_id",
  "apps_sources",
  "apps_exclude_sources",
  "card_domain",
  "card_url",
  "card_name",
] as const;

function isConfigured(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0 && value !== "none";
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "number") {
    return true;
  }

  return value === true;
}

export const fetchTwitterDataInputSchema = twitterSourceSchema.superRefine(
  (data, ctx) => {
    const hasSearch = twitterSearchFields.some((field) =>
      isConfigured(data[field])
    );

    if (!hasSearch) {
      ctx.addIssue({
        code: "custom",
        message:
          "Provide a Twitter/X query, search terms, or at least one advanced search filter.",
      });
    }
  }
);

export type FetchTwitterDataInput = z.infer<typeof fetchTwitterDataInputSchema>;
