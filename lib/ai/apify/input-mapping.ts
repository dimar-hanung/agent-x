import { APIFY_SOCIAL_ACTORS } from "./constants";
import {
  compactObject,
  createQueryHash,
  normalizeOptionalString,
  normalizeStringArray,
} from "./hash";
import type { PreparedApifyRequest } from "./types";

const DEFAULT_TIKTOK_RESULTS_PER_PAGE = 20;
const DEFAULT_TWITTER_MAX_ITEMS = 100;
const DEFAULT_THREADS_MAX_POSTS = 20;

interface TikTokRequestInput {
  hashtags?: string[];
  profiles?: string[];
  search_queries?: string[];
  post_urls?: string[];
  results_per_page?: number;
  profile_scrape_sections?: Array<"videos" | "reposts">;
  profile_sorting?: "latest" | "popular" | "oldest";
  search_section?: "top" | "video" | "user";
  video_search_sorting?: "MOST_RELEVANT" | "MOST_LIKED" | "LATEST";
  video_search_date_filter?:
    | "ALL_TIME"
    | "PAST_24_HOURS"
    | "PAST_WEEK"
    | "PAST_MONTH"
    | "LAST_3_MONTHS"
    | "LAST_6_MONTHS";
  exclude_pinned_posts?: boolean;
  oldest_post_date_unified?: string;
  newest_post_date?: string;
  least_diggs?: number;
  most_diggs?: number;
  comments_per_post?: number;
  top_level_comments_per_post?: number;
  max_replies_per_comment?: number;
  proxy_country_code?: string;
  scrape_related_videos?: boolean;
}

interface TwitterRequestInput {
  start_urls?: string[];
  search_terms?: string[];
  twitter_handles?: string[];
  conversation_ids?: string[];
  max_items?: number;
  sort?: "Top" | "Latest" | "Latest + Top";
  tweet_language?: string;
  only_verified_users?: boolean;
  only_twitter_blue?: boolean;
  only_image?: boolean;
  only_video?: boolean;
  only_quote?: boolean;
  author?: string;
  in_reply_to?: string;
  mentioning?: string;
  geotagged_near?: string;
  within_radius?: string;
  geocode?: string;
  place_object_id?: string;
  minimum_retweets?: number;
  minimum_favorites?: number;
  minimum_replies?: number;
  start?: string;
  end?: string;
  include_search_terms?: boolean;
}

interface ThreadsRequestInput {
  search_query?: string;
  search_queries?: string[];
  sort?: "top" | "recent";
  from_user?: string;
  before?: string;
  after?: string;
  max_posts?: number;
  cursor?: string;
}

function withHash(request: Omit<PreparedApifyRequest, "queryHash">): PreparedApifyRequest {
  return {
    ...request,
    queryHash: createQueryHash({
      platform: request.platform,
      input: request.normalizedInput,
    }),
  };
}

function mapTikTokSearchSection(section: TikTokRequestInput["search_section"]): string | undefined {
  if (!section || section === "top") {
    return undefined;
  }

  return `/${section}`;
}

function buildCombinedSearchQuery(queries: string[]): string {
  if (queries.length === 1) {
    return queries[0];
  }

  return queries
    .map((query) => (query.includes(" ") ? `"${query}"` : query))
    .join(" OR ");
}

export function buildTikTokApifyRequest(input: TikTokRequestInput): PreparedApifyRequest {
  const hashtags = normalizeStringArray(input.hashtags);
  const profiles = normalizeStringArray(input.profiles);
  const searchQueries = normalizeStringArray(input.search_queries);
  const postUrls = normalizeStringArray(input.post_urls);

  if (
    hashtags.length === 0 &&
    profiles.length === 0 &&
    searchQueries.length === 0 &&
    postUrls.length === 0
  ) {
    throw new Error("Isi minimal satu sumber TikTok: hashtag, profil, query, atau URL post.");
  }

  const resultsPerPage = input.results_per_page ?? DEFAULT_TIKTOK_RESULTS_PER_PAGE;
  const profileScrapeSections = input.profile_scrape_sections ?? ["videos"];
  const profileSorting = input.profile_sorting ?? "latest";
  const searchSection = input.search_section ?? "top";
  const actorSearchSection = mapTikTokSearchSection(searchSection);
  const proxyCountryCode = normalizeOptionalString(input.proxy_country_code) ?? "None";

  const normalizedInput = compactObject({
    hashtags,
    profiles,
    search_queries: searchQueries,
    post_urls: postUrls,
    results_per_page: resultsPerPage,
    profile_scrape_sections: profiles.length > 0 ? profileScrapeSections : undefined,
    profile_sorting: profiles.length > 0 ? profileSorting : undefined,
    search_section: searchQueries.length > 0 ? searchSection : undefined,
    video_search_sorting: input.video_search_sorting,
    video_search_date_filter: input.video_search_date_filter,
    exclude_pinned_posts: input.exclude_pinned_posts ?? false,
    oldest_post_date_unified: normalizeOptionalString(input.oldest_post_date_unified),
    newest_post_date: normalizeOptionalString(input.newest_post_date),
    least_diggs: input.least_diggs,
    most_diggs: input.most_diggs,
    comments_per_post: input.comments_per_post,
    top_level_comments_per_post: input.top_level_comments_per_post,
    max_replies_per_comment: input.max_replies_per_comment,
    proxy_country_code: proxyCountryCode,
    scrape_related_videos: input.scrape_related_videos ?? false,
  });

  const actorInput = compactObject({
    hashtags,
    profiles,
    searchQueries,
    postURLs: postUrls,
    resultsPerPage,
    profileScrapeSections: profiles.length > 0 ? profileScrapeSections : undefined,
    profileSorting: profiles.length > 0 ? profileSorting : undefined,
    searchSection: searchQueries.length > 0 ? actorSearchSection : undefined,
    videoSearchSorting: input.video_search_sorting,
    videoSearchDateFilter: input.video_search_date_filter,
    excludePinnedPosts: input.exclude_pinned_posts ?? false,
    oldestPostDateUnified: normalizeOptionalString(input.oldest_post_date_unified),
    newestPostDate: normalizeOptionalString(input.newest_post_date),
    leastDiggs: input.least_diggs,
    mostDiggs: input.most_diggs,
    commentsPerPost: input.comments_per_post,
    topLevelCommentsPerPost: input.top_level_comments_per_post,
    maxRepliesPerComment: input.max_replies_per_comment,
    proxyCountryCode,
    scrapeRelatedVideos: input.scrape_related_videos ?? false,
  });

  return withHash({
    platform: "tiktok",
    actorId: APIFY_SOCIAL_ACTORS.tiktok,
    normalizedInput,
    actorInput,
  });
}

export function buildTwitterApifyRequest(input: TwitterRequestInput): PreparedApifyRequest {
  const startUrls = normalizeStringArray(input.start_urls);
  const searchTerms = normalizeStringArray(input.search_terms);
  const twitterHandles = normalizeStringArray(input.twitter_handles);
  const conversationIds = normalizeStringArray(input.conversation_ids);
  const author = normalizeOptionalString(input.author);
  const inReplyTo = normalizeOptionalString(input.in_reply_to);
  const mentioning = normalizeOptionalString(input.mentioning);

  if (
    startUrls.length === 0 &&
    searchTerms.length === 0 &&
    twitterHandles.length === 0 &&
    conversationIds.length === 0 &&
    !author &&
    !inReplyTo &&
    !mentioning
  ) {
    throw new Error("Isi minimal satu sumber Twitter/X: URL, search term, handle, conversation ID, author, reply, atau mention.");
  }

  const maxItems = input.max_items ?? DEFAULT_TWITTER_MAX_ITEMS;
  const sort = input.sort ?? "Latest";

  const normalizedInput = compactObject({
    start_urls: startUrls,
    search_terms: searchTerms,
    twitter_handles: twitterHandles,
    conversation_ids: conversationIds,
    max_items: maxItems,
    sort,
    tweet_language: normalizeOptionalString(input.tweet_language)?.toLowerCase(),
    only_verified_users: input.only_verified_users ?? false,
    only_twitter_blue: input.only_twitter_blue ?? false,
    only_image: input.only_image ?? false,
    only_video: input.only_video ?? false,
    only_quote: input.only_quote ?? false,
    author,
    in_reply_to: inReplyTo,
    mentioning,
    geotagged_near: normalizeOptionalString(input.geotagged_near),
    within_radius: normalizeOptionalString(input.within_radius),
    geocode: normalizeOptionalString(input.geocode),
    place_object_id: normalizeOptionalString(input.place_object_id),
    minimum_retweets: input.minimum_retweets,
    minimum_favorites: input.minimum_favorites,
    minimum_replies: input.minimum_replies,
    start: normalizeOptionalString(input.start),
    end: normalizeOptionalString(input.end),
    include_search_terms: input.include_search_terms ?? false,
  });

  const actorInput = compactObject({
    startUrls,
    searchTerms,
    twitterHandles,
    conversationIds,
    maxItems,
    sort,
    tweetLanguage: normalizeOptionalString(input.tweet_language)?.toLowerCase(),
    onlyVerifiedUsers: input.only_verified_users ?? false,
    onlyTwitterBlue: input.only_twitter_blue ?? false,
    onlyImage: input.only_image ?? false,
    onlyVideo: input.only_video ?? false,
    onlyQuote: input.only_quote ?? false,
    author,
    inReplyTo,
    mentioning,
    geotaggedNear: normalizeOptionalString(input.geotagged_near),
    withinRadius: normalizeOptionalString(input.within_radius),
    geocode: normalizeOptionalString(input.geocode),
    placeObjectId: normalizeOptionalString(input.place_object_id),
    minimumRetweets: input.minimum_retweets,
    minimumFavorites: input.minimum_favorites,
    minimumReplies: input.minimum_replies,
    start: normalizeOptionalString(input.start),
    end: normalizeOptionalString(input.end),
    includeSearchTerms: input.include_search_terms ?? false,
  });

  return withHash({
    platform: "twitter",
    actorId: APIFY_SOCIAL_ACTORS.twitter,
    normalizedInput,
    actorInput,
  });
}

export function buildThreadsApifyRequest(input: ThreadsRequestInput): PreparedApifyRequest {
  const searchQueries = normalizeStringArray(
    input.search_queries ?? (input.search_query ? [input.search_query] : [])
  );

  if (searchQueries.length === 0) {
    throw new Error("Isi search query Threads.");
  }

  const searchQuery = buildCombinedSearchQuery(searchQueries);
  const cursor = normalizeOptionalString(input.cursor);
  const maxPosts = cursor ? undefined : input.max_posts ?? DEFAULT_THREADS_MAX_POSTS;
  const sort = input.sort ?? "top";

  const normalizedInput = compactObject({
    search_query: searchQuery,
    search_queries: searchQueries,
    sort,
    from_user: normalizeOptionalString(input.from_user),
    before: normalizeOptionalString(input.before),
    after: normalizeOptionalString(input.after),
    max_posts: maxPosts,
    cursor,
  });

  const actorInput = compactObject({
    searchQuery,
    sort,
    from: normalizeOptionalString(input.from_user),
    before: normalizeOptionalString(input.before),
    after: normalizeOptionalString(input.after),
    maxPosts,
    cursor,
  });

  return withHash({
    platform: "threads",
    actorId: APIFY_SOCIAL_ACTORS.threads,
    normalizedInput,
    actorInput,
  });
}