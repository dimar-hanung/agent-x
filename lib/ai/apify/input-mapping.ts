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
const DEFAULT_TWITTER_LATEST_DAYS = 7;
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
  query?: string;
  search_terms?: string[];
  latest?: boolean;
  number_of_tweets?: number;
  scrape_all?: boolean;
  engagement_level?: "none" | "low" | "medium" | "high" | "viral";
  engagement_min_retweets?: number;
  engagement_max_retweets?: number;
  engagement_min_likes?: number;
  engagement_max_likes?: number;
  engagement_min_replies?: number;
  engagement_max_replies?: number;
  engagement_has_engagement?: boolean;
  media_types?: string[];
  media_has_links?: boolean;
  media_has_mentions?: boolean;
  media_has_hashtags?: boolean;
  media_news_only?: boolean;
  media_safe_content_only?: boolean;
  users_blue_verified_only?: boolean;
  users_verified_only?: boolean;
  users_from_users?: string[];
  users_to_users?: string[];
  users_mention_users?: string[];
  users_exclude_from_users?: string[];
  users_list_members?: string[];
  content_language?: string;
  content_emoticons?: "positive" | "negative";
  content_keywords?: string[];
  content_exact_phrases?: string[];
  content_exclude_keywords?: string[];
  content_hashtags?: string[];
  content_exclude_hashtags?: string[];
  content_cashtags?: string[];
  content_question_marks?: boolean;
  tweet_types?: string[];
  tweet_types_exclude?: string[];
  tweet_conversation_id?: string;
  tweet_quoted_tweet_id?: string;
  tweet_quoted_user_id?: string;
  tweet_poll_types?: string[];
  time_since?: string;
  time_until?: string;
  time_within_time?: string;
  time_since_unix?: number;
  time_until_unix?: number;
  time_since_id?: string;
  time_max_id?: string;
  geo_near?: string;
  geo_within_radius?: string;
  geo_geocode?: string;
  geo_place_id?: string;
  apps_sources?: string[];
  apps_exclude_sources?: string[];
  card_domain?: string;
  card_url?: string;
  card_name?: string;
}

interface BuildTwitterApifyRequestOptions {
  now?: Date;
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

export function buildTwitterApifyRequest(
  input: TwitterRequestInput,
  options: BuildTwitterApifyRequestOptions = {}
): PreparedApifyRequest {
  const explicitQuery = normalizeOptionalString(input.query);
  const searchTerms = normalizeStringArray(input.search_terms);
  const query =
    explicitQuery ??
    (searchTerms.length > 0 ? buildCombinedSearchQuery(searchTerms) : undefined);
  const numberOfTweets = input.number_of_tweets ?? DEFAULT_TWITTER_MAX_ITEMS;
  const explicitRelativeTime = normalizeOptionalString(input.time_within_time);
  const hasAlternateTimeFilter =
    Boolean(explicitRelativeTime) ||
    input.time_since_unix !== undefined ||
    input.time_until_unix !== undefined ||
    Boolean(normalizeOptionalString(input.time_since_id)) ||
    Boolean(normalizeOptionalString(input.time_max_id));
  const latestRange = input.latest && !hasAlternateTimeFilter
    ? buildLatestTwitterDateRange(options.now ?? new Date())
    : undefined;
  const timeSince = normalizeOptionalString(input.time_since) ?? latestRange?.start;
  const timeUntil = normalizeOptionalString(input.time_until) ?? latestRange?.end;

  const normalizedInput = compactObject({
    query,
    search_type: "Top",
    number_of_tweets: numberOfTweets,
    scrape_all: input.scrape_all ?? false,
    engagement_level: input.engagement_level ?? "none",
    engagement_min_retweets: input.engagement_min_retweets,
    engagement_max_retweets: input.engagement_max_retweets,
    engagement_min_likes: input.engagement_min_likes,
    engagement_max_likes: input.engagement_max_likes,
    engagement_min_replies: input.engagement_min_replies,
    engagement_max_replies: input.engagement_max_replies,
    engagement_has_engagement: input.engagement_has_engagement,
    media_types: normalizeStringArray(input.media_types),
    media_has_links: input.media_has_links,
    media_has_mentions: input.media_has_mentions,
    media_has_hashtags: input.media_has_hashtags,
    media_news_only: input.media_news_only,
    media_safe_content_only: input.media_safe_content_only,
    users_blue_verified_only: input.users_blue_verified_only,
    users_verified_only: input.users_verified_only,
    users_from_users: normalizeStringArray(input.users_from_users),
    users_to_users: normalizeStringArray(input.users_to_users),
    users_mention_users: normalizeStringArray(input.users_mention_users),
    users_exclude_from_users: normalizeStringArray(
      input.users_exclude_from_users
    ),
    users_list_members: normalizeStringArray(input.users_list_members),
    content_language: normalizeOptionalString(
      input.content_language
    )?.toLowerCase(),
    content_emoticons: input.content_emoticons,
    content_keywords: normalizeStringArray(input.content_keywords),
    content_exact_phrases: normalizeStringArray(input.content_exact_phrases),
    content_exclude_keywords: normalizeStringArray(
      input.content_exclude_keywords
    ),
    content_hashtags: normalizeStringArray(input.content_hashtags),
    content_exclude_hashtags: normalizeStringArray(
      input.content_exclude_hashtags
    ),
    content_cashtags: normalizeStringArray(input.content_cashtags),
    content_question_marks: input.content_question_marks,
    tweet_types: normalizeStringArray(input.tweet_types),
    tweet_types_exclude: normalizeStringArray(input.tweet_types_exclude),
    tweet_conversation_id: normalizeOptionalString(
      input.tweet_conversation_id
    ),
    tweet_quoted_tweet_id: normalizeOptionalString(input.tweet_quoted_tweet_id),
    tweet_quoted_user_id: normalizeOptionalString(input.tweet_quoted_user_id),
    tweet_poll_types: normalizeStringArray(input.tweet_poll_types),
    time_since: timeSince,
    time_until: timeUntil,
    time_within_time: explicitRelativeTime,
    time_since_unix: input.time_since_unix,
    time_until_unix: input.time_until_unix,
    time_since_id: normalizeOptionalString(input.time_since_id),
    time_max_id: normalizeOptionalString(input.time_max_id),
    geo_near: normalizeOptionalString(input.geo_near),
    geo_within_radius: normalizeOptionalString(input.geo_within_radius),
    geo_geocode: normalizeOptionalString(input.geo_geocode),
    geo_place_id: normalizeOptionalString(input.geo_place_id),
    apps_sources: normalizeStringArray(input.apps_sources),
    apps_exclude_sources: normalizeStringArray(input.apps_exclude_sources),
    card_domain: normalizeOptionalString(input.card_domain),
    card_url: normalizeOptionalString(input.card_url),
    card_name: input.card_name,
  });

  const actorInput = compactObject({
    query,
    search_type: "Top",
    numberOfTweets,
    scrapeAll: input.scrape_all ?? false,
    engagementLevel: input.engagement_level ?? "none",
    engagementMinRetweets: input.engagement_min_retweets,
    engagementMaxRetweets: input.engagement_max_retweets,
    engagementMinLikes: input.engagement_min_likes,
    engagementMaxLikes: input.engagement_max_likes,
    engagementMinReplies: input.engagement_min_replies,
    engagementMaxReplies: input.engagement_max_replies,
    engagementHasEngagement: input.engagement_has_engagement,
    mediaTypes: normalizeStringArray(input.media_types),
    mediaHasLinks: input.media_has_links,
    mediaHasMentions: input.media_has_mentions,
    mediaHasHashtags: input.media_has_hashtags,
    mediaNewsOnly: input.media_news_only,
    mediaSafeContentOnly: input.media_safe_content_only,
    usersBlueVerifiedOnly: input.users_blue_verified_only,
    usersVerifiedOnly: input.users_verified_only,
    usersFromUsers: normalizeStringArray(input.users_from_users),
    usersToUsers: normalizeStringArray(input.users_to_users),
    usersMentionUsers: normalizeStringArray(input.users_mention_users),
    usersExcludeFromUsers: normalizeStringArray(input.users_exclude_from_users),
    usersListMembers: normalizeStringArray(input.users_list_members),
    contentLanguage: normalizeOptionalString(
      input.content_language
    )?.toLowerCase(),
    contentEmoticons: input.content_emoticons,
    contentKeywords: normalizeStringArray(input.content_keywords),
    contentExactPhrases: normalizeStringArray(input.content_exact_phrases),
    contentExcludeKeywords: normalizeStringArray(
      input.content_exclude_keywords
    ),
    contentHashtags: normalizeStringArray(input.content_hashtags),
    contentExcludeHashtags: normalizeStringArray(
      input.content_exclude_hashtags
    ),
    contentCashtags: normalizeStringArray(input.content_cashtags),
    contentQuestionMarks: input.content_question_marks,
    tweetTypes: normalizeStringArray(input.tweet_types),
    tweetTypesExclude: normalizeStringArray(input.tweet_types_exclude),
    tweetConversationId: normalizeOptionalString(input.tweet_conversation_id),
    tweetQuotedTweetId: normalizeOptionalString(input.tweet_quoted_tweet_id),
    tweetQuotedUserId: normalizeOptionalString(input.tweet_quoted_user_id),
    tweetPollTypes: normalizeStringArray(input.tweet_poll_types),
    timeSince,
    timeUntil,
    timeWithinTime: explicitRelativeTime,
    timeSinceUnix: input.time_since_unix,
    timeUntilUnix: input.time_until_unix,
    timeSinceId: normalizeOptionalString(input.time_since_id),
    timeMaxId: normalizeOptionalString(input.time_max_id),
    geoNear: normalizeOptionalString(input.geo_near),
    geoWithinRadius: normalizeOptionalString(input.geo_within_radius),
    geoGeocode: normalizeOptionalString(input.geo_geocode),
    geoPlaceId: normalizeOptionalString(input.geo_place_id),
    appsSources: normalizeStringArray(input.apps_sources),
    appsExcludeSources: normalizeStringArray(input.apps_exclude_sources),
    cardDomain: normalizeOptionalString(input.card_domain),
    cardUrl: normalizeOptionalString(input.card_url),
    cardName: input.card_name,
  });

  if (!hasTwitterSearchCriteria(actorInput)) {
    throw new Error(
      "Isi query, search term, atau minimal satu filter pencarian Twitter/X."
    );
  }

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

function datePartsInJakarta(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildLatestTwitterDateRange(now: Date): {
  start: string;
  end: string;
} {
  const { year, month, day } = datePartsInJakarta(now);
  const today = new Date(Date.UTC(year, month - 1, day));
  const dayInMs = 24 * 60 * 60 * 1000;

  return {
    start: formatUtcDate(
      new Date(today.getTime() - DEFAULT_TWITTER_LATEST_DAYS * dayInMs)
    ),
    // Actor's end date is exclusive, so tomorrow keeps today's posts included.
    end: formatUtcDate(new Date(today.getTime() + dayInMs)),
  };
}

const TWITTER_NON_SEARCH_FIELDS = new Set([
  "search_type",
  "numberOfTweets",
  "scrapeAll",
  "timeSince",
  "timeUntil",
  "timeWithinTime",
  "timeSinceUnix",
  "timeUntilUnix",
  "timeSinceId",
  "timeMaxId",
]);

function hasTwitterSearchCriteria(input: Record<string, unknown>): boolean {
  return Object.entries(input).some(([key, value]) => {
    if (TWITTER_NON_SEARCH_FIELDS.has(key)) {
      return false;
    }

    if (key === "engagementLevel" && value === "none") {
      return false;
    }

    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    if (typeof value === "number") {
      return true;
    }

    return value === true;
  });
}
