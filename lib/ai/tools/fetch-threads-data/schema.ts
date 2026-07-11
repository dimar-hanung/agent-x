import { z } from "zod";

export const fetchThreadsDataInputSchema = z
  .object({
    force_refresh: z
      .boolean()
      .optional()
      .describe("Set true to bypass previously collected data and request fresh results."),
    search_query: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Single keyword, topic, hashtag, or phrase to search on Threads. Use search_queries instead when the user gives multiple topics."
      ),
    search_queries: z
      .array(z.string().min(1))
      .min(1)
      .max(10)
      .optional()
      .describe(
        "Multiple Threads topics to search in one Apify request. Example: ['BEI', 'IHSG', 'OJK']. Do not call this tool multiple times for multiple terms on Threads; pass them here."
      ),
    sort: z
      .enum(["top", "recent"])
      .optional()
      .describe("Sort results by top or recent. Default: top."),
    from_user: z
      .string()
      .optional()
      .describe("Filter results to posts from this username, without @."),
    before: z
      .string()
      .optional()
      .describe("Show posts created before this date. Prefer YYYY-MM-DD."),
    after: z
      .string()
      .optional()
      .describe("Show posts created after this date. Prefer YYYY-MM-DD."),
    max_posts: z
      .number()
      .int()
      .min(20)
      .max(1000)
      .optional()
      .describe("Maximum posts to scrape. Default: 20. Ignored when cursor is set."),
    cursor: z
      .string()
      .optional()
      .describe("Pagination cursor from a previous run. When set, max_posts is ignored."),
  })
  .superRefine((data, ctx) => {
    if (!data.search_query?.trim() && (data.search_queries?.length ?? 0) === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Provide search_query or search_queries for Threads.",
      });
    }
  });

export type FetchThreadsDataInput = z.infer<typeof fetchThreadsDataInputSchema>;