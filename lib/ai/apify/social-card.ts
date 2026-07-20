import type { ApifySocialPlatform } from "@/lib/db/schema";
import type { WhatsAppMediaMessage } from "@/lib/integrations/whatsapp/types";

import { platformLabel } from "./preview";
import type { ApifyPreviewItem } from "./types";

const MAX_CAPTION_LENGTH = 1_000;
const numberFormatter = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const METRIC_LABELS: Record<string, string> = {
  likes: "Suka",
  retweets: "Retweet",
  replies: "Balasan",
  quotes: "Kutipan",
  views: "Tayangan",
  plays: "Diputar",
  comments: "Komentar",
  shares: "Dibagikan",
  saves: "Disimpan",
  reposts: "Repost",
  reshares: "Dibagikan",
};

function singleLine(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }

  if (limit <= 3) {
    return "";
  }

  return `${value.slice(0, limit - 3).trimEnd()}...`;
}

function formatMetrics(metrics: Record<string, number> | undefined): string {
  if (!metrics) {
    return "";
  }

  return Object.entries(metrics)
    .slice(0, 4)
    .map(
      ([key, value]) =>
        `${METRIC_LABELS[key] ?? key}: ${numberFormatter.format(value)}`
    )
    .join(" | ");
}

function inferImageMimeType(url: string): string {
  try {
    const pathname = new URL(url).pathname.toLowerCase();

    if (pathname.endsWith(".png")) {
      return "image/png";
    }

    if (pathname.endsWith(".webp")) {
      return "image/webp";
    }

    if (pathname.endsWith(".gif")) {
      return "image/gif";
    }
  } catch {
    // Preview extraction already validates the URL.
  }

  return "image/jpeg";
}

export function buildSocialMediaCard(
  platform: ApifySocialPlatform,
  previews: ApifyPreviewItem[]
): WhatsAppMediaMessage | null {
  const preview = previews.find((item) => item.imageUrl);

  if (!preview?.imageUrl) {
    return null;
  }

  const heading = `\u{1F4CC} *Sorotan ${platformLabel(platform)}*`;
  const author = preview.author
    ? `\u{1F464} ${preview.author.startsWith("@") ? preview.author : `@${preview.author}`}`
    : "";
  const metrics = formatMetrics(preview.metrics);
  const metricsLine = metrics ? `\u{1F4CA} ${metrics}` : "";
  const urlLine = preview.url
    ? `\u{1F517} ${truncate(singleLine(preview.url), 320)}`
    : "";
  const fixedLines = [heading, author, metricsLine, urlLine].filter(Boolean);
  const fixedLength = fixedLines.join("\n\n").length;
  const availableTextLength = Math.max(
    0,
    MAX_CAPTION_LENGTH - fixedLength - (fixedLines.length > 0 ? 2 : 0)
  );
  const body = preview.text ?? preview.title ?? "";
  const text = body
    ? truncate(singleLine(body), availableTextLength)
    : "";
  const caption = [heading, author, text, metricsLine, urlLine]
    .filter(Boolean)
    .join("\n\n");

  return {
    mediaType: "image",
    mediaUrl: preview.imageUrl,
    mimeType: inferImageMimeType(preview.imageUrl),
    fileName: `sorotan-${platform}.jpg`,
    caption,
  };
}
