import type {
  ApifySocialPlatform,
  ApifySocialSnapshot,
} from "@/lib/db/schema";

import { APIFY_SOCIAL_LABELS } from "./constants";
import type { ApifyPreviewItem } from "./types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readPath(item: Record<string, unknown>, path: string): unknown {
  if (path in item) {
    return item[path];
  }

  let current: unknown = item;

  for (const key of path.split(".")) {
    if (Array.isArray(current)) {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
      continue;
    }

    const record = asRecord(current);
    if (!record || !(key in record)) {
      return undefined;
    }
    current = record[key];
  }

  return current;
}

export function readString(
  item: Record<string, unknown>,
  paths: string[]
): string | undefined {
  for (const path of paths) {
    const value = readPath(item, path);
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function readHttpUrl(
  item: Record<string, unknown>,
  paths: string[]
): string | undefined {
  const value = readString(item, paths);

  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function readNumber(
  item: Record<string, unknown>,
  paths: string[]
): number | undefined {
  for (const path of paths) {
    const value = readPath(item, path);

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const numericValue = Number(value.replace(/,/g, ""));
      if (Number.isFinite(numericValue)) {
        return numericValue;
      }
    }
  }

  return undefined;
}

function collectMetrics(
  item: Record<string, unknown>,
  map: Record<string, string[]>
): Record<string, number> | undefined {
  const metrics: Record<string, number> = {};

  for (const [label, paths] of Object.entries(map)) {
    const value = readNumber(item, paths);
    if (value !== undefined) {
      metrics[label] = value;
    }
  }

  return Object.keys(metrics).length > 0 ? metrics : undefined;
}

function previewTikTok(item: Record<string, unknown>): ApifyPreviewItem {
  return {
    text: readString(item, [
      "text",
      "description",
      "desc",
      "title",
      "videoMeta.description",
    ]),
    url: readString(item, ["webVideoUrl", "shareUrl", "videoUrl", "url"]),
    imageUrl: readHttpUrl(item, [
      "videoMeta.coverUrl",
      "videoMeta.originalCoverUrl",
      "covers.default",
      "covers.origin",
      "covers.dynamic",
      "imagePost.coverImages.0",
      "imagePost.images.0",
      "thumbnailUrl",
      "thumbnail",
      "cover",
    ]),
    author: readString(item, [
      "authorMeta.name",
      "authorMeta.nickName",
      "authorMeta.nickName",
      "author.username",
      "author.uniqueId",
      "username",
    ]),
    createdAt: readString(item, ["createTimeISO", "createTimeUTC", "createdAt"]),
    metrics: collectMetrics(item, {
      likes: ["diggCount", "likeCount", "likes"],
      plays: ["playCount", "views", "viewCount"],
      comments: ["commentCount", "comments"],
      shares: ["shareCount", "shares"],
      saves: ["collectCount", "saveCount"],
    }),
  };
}

function previewTwitter(item: Record<string, unknown>): ApifyPreviewItem {
  return {
    text: readString(item, [
      "text",
      "fullText",
      "full_text",
      "tweetText",
      "noteTweet.text",
      "article.previewText",
      "article.title",
    ]),
    url: readString(item, ["url", "twitterUrl", "tweetUrl"]),
    imageUrl: readHttpUrl(item, [
      "media.photo.0.media_url_https",
      "media.video.media_url_https",
      "media.animated_gif.media_url_https",
      "media.0.media_url_https",
      "media.0.url",
      "entities.media.0.media_url_https",
      "extendedEntities.media.0.media_url_https",
      "extended_entities.media.0.media_url_https",
      "card.binding_values.thumbnail_image_large.image_value.url",
      "card.binding_values.thumbnail_image.image_value.url",
    ]),
    author: readString(item, [
      "author.userName",
      "author.username",
      "author.name",
      "user.username",
      "user.screen_name",
      "user_info.screen_name",
      "user_info.name",
      "screen_name",
      "username",
    ]),
    createdAt: readString(item, ["createdAt", "created_at", "timestamp"]),
    metrics: collectMetrics(item, {
      likes: ["likeCount", "favoriteCount", "favorites", "likes"],
      retweets: ["retweetCount", "retweets"],
      replies: ["replyCount", "reply_count", "replies"],
      quotes: ["quoteCount", "quotes"],
      views: ["viewCount", "views"],
    }),
  };
}

function previewThreads(item: Record<string, unknown>): ApifyPreviewItem {
  return {
    text: readString(item, [
      "captionText",
      "text_content",
      "caption",
      "text",
    ]),
    url: readString(item, ["postUrl", "thread_url", "url"]),
    imageUrl: readHttpUrl(item, [
      "imageUrl",
      "thumbnailUrl",
      "linkPreviewImageUrl",
      "image_url",
      "thumbnail_url",
      "media.0.url",
      "media.0.imageUrl",
    ]),
    author: readString(item, ["username", "user.username", "user.full_name"]),
    createdAt: readString(item, ["takenAtISO", "timestamp", "takenAtFormatted"]),
    metrics: collectMetrics(item, {
      likes: ["likeCount", "like_count"],
      comments: ["directReplyCount", "comment_count"],
      reposts: ["repostCount", "repost_count"],
      quotes: ["quoteCount", "quote_count"],
      reshares: ["reshareCount", "reshare_count"],
    }),
  };
}

function previewGeneric(item: Record<string, unknown>): ApifyPreviewItem {
  return {
    title: readString(item, ["title", "name"]),
    text: readString(item, ["text", "caption", "description"]),
    url: readString(item, ["url", "link"]),
  };
}

export function getSnapshotItems(snapshot: ApifySocialSnapshot): unknown[] {
  return Array.isArray(snapshot.items) ? snapshot.items : [];
}

export function buildPreviewItems(
  platform: ApifySocialPlatform,
  items: unknown[],
  limit = 5
): ApifyPreviewItem[] {
  const previews: ApifyPreviewItem[] = [];

  for (const item of items) {
    if (previews.length >= limit) {
      break;
    }

    const record = asRecord(item);
    if (!record) {
      continue;
    }

    if (platform === "twitter" && record.noResults === true) {
      continue;
    }

    const preview =
      platform === "tiktok"
        ? previewTikTok(record)
        : platform === "twitter"
          ? previewTwitter(record)
          : platform === "threads"
            ? previewThreads(record)
            : previewGeneric(record);

    if (
      !preview.text &&
      !preview.title &&
      !preview.url &&
      !preview.imageUrl &&
      !preview.author &&
      !preview.createdAt &&
      !preview.metrics
    ) {
      continue;
    }

    previews.push(preview);
  }

  return previews;
}

export function formatPreviewBullet(item: ApifyPreviewItem): string {
  const subject = item.text ?? item.title ?? item.url ?? "Item tanpa teks";
  const author = item.author ? ` oleh ${item.author}` : "";
  const date = item.createdAt ? ` (${item.createdAt})` : "";
  const url = item.url ? ` - ${item.url}` : "";
  return `- ${subject}${author}${date}${url}`;
}

export function platformLabel(platform: ApifySocialPlatform): string {
  return APIFY_SOCIAL_LABELS[platform] ?? platform;
}
