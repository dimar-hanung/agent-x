import { z } from "zod";

const twitterSourceSchema = z.object({
  force_refresh: z
    .boolean()
    .optional()
    .describe("Set true to bypass previously collected data and request fresh results."),
  start_urls: z
    .array(z.string().url())
    .optional()
    .describe("Twitter/X tweet, profile, search, or list URLs."),
  search_terms: z
    .array(z.string().min(1))
    .optional()
    .describe("Twitter/X advanced search terms. Put multiple topics in this array and call this tool once for one Twitter/X request."),
  twitter_handles: z
    .array(z.string().min(1))
    .optional()
    .describe("Twitter/X handles to scrape."),
  conversation_ids: z
    .array(z.string().min(1))
    .optional()
    .describe("Conversation IDs to scrape."),
  max_items: z
    .number()
    .int()
    .min(1)
    .max(5000)
    .optional()
    .describe("Maximum tweets to output. Default: 100."),
  sort: z
    .enum(["Top", "Latest", "Latest + Top"])
    .optional()
    .describe("Twitter/X search sorting. Default: Latest."),
  tweet_language: z
    .string()
    .min(2)
    .max(8)
    .optional()
    .describe("Restrict tweets to a language code, e.g. en or id."),
  only_verified_users: z.boolean().optional(),
  only_twitter_blue: z.boolean().optional(),
  only_image: z.boolean().optional(),
  only_video: z.boolean().optional(),
  only_quote: z.boolean().optional(),
  author: z
    .string()
    .optional()
    .describe("Return tweets sent by this Twitter/X handle."),
  in_reply_to: z
    .string()
    .optional()
    .describe("Return tweets that are replies to this handle."),
  mentioning: z
    .string()
    .optional()
    .describe("Return tweets mentioning this handle."),
  geotagged_near: z.string().optional(),
  within_radius: z.string().optional(),
  geocode: z.string().optional(),
  place_object_id: z.string().optional(),
  minimum_retweets: z.number().int().min(0).optional(),
  minimum_favorites: z.number().int().min(0).optional(),
  minimum_replies: z.number().int().min(0).optional(),
  start: z
    .string()
    .optional()
    .describe("Return tweets sent after this date. Prefer YYYY-MM-DD."),
  end: z
    .string()
    .optional()
    .describe("Return tweets sent before this date. Prefer YYYY-MM-DD."),
  include_search_terms: z
    .boolean()
    .optional()
    .describe("Add the matching search term to each output tweet."),
});

export const fetchTwitterDataInputSchema = twitterSourceSchema.superRefine(
  (data, ctx) => {
    const hasSource =
      (data.start_urls?.length ?? 0) > 0 ||
      (data.search_terms?.length ?? 0) > 0 ||
      (data.twitter_handles?.length ?? 0) > 0 ||
      (data.conversation_ids?.length ?? 0) > 0 ||
      Boolean(data.author?.trim()) ||
      Boolean(data.in_reply_to?.trim()) ||
      Boolean(data.mentioning?.trim());

    if (!hasSource) {
      ctx.addIssue({
        code: "custom",
        message:
          "Provide at least one Twitter/X source: start_urls, search_terms, twitter_handles, conversation_ids, author, in_reply_to, or mentioning.",
      });
    }
  }
);

export type FetchTwitterDataInput = z.infer<typeof fetchTwitterDataInputSchema>;