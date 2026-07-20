"use client";

import { ExternalLink, MessageCircle } from "lucide-react";
import type { UIMessage } from "ai";

import type { ApifyPreviewItem } from "@/lib/ai/apify/types";
import { cn } from "@/lib/utils";

type SocialPlatform = "twitter" | "threads" | "tiktok";

const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  twitter: "Twitter/X",
  threads: "Threads",
  tiktok: "TikTok",
};

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

const numberFormatter = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function isSocialPlatform(value: unknown): value is SocialPlatform {
  return value === "twitter" || value === "threads" || value === "tiktok";
}

function getSocialPreviews(message: UIMessage): {
  platform: SocialPlatform;
  previews: ApifyPreviewItem[];
} | null {
  const metadata =
    message.metadata && typeof message.metadata === "object"
      ? (message.metadata as Record<string, unknown>)
      : null;

  if (!metadata || !isSocialPlatform(metadata.platform)) {
    return null;
  }

  const previews = Array.isArray(metadata.socialPreviews)
    ? metadata.socialPreviews.filter(
        (item): item is ApifyPreviewItem =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item)
      )
    : [];

  return previews.length > 0
    ? { platform: metadata.platform, previews }
    : null;
}

function formatMetrics(metrics: Record<string, number> | undefined): string {
  if (!metrics) {
    return "";
  }

  return Object.entries(metrics)
    .slice(0, 4)
    .map(
      ([key, value]) =>
        `${METRIC_LABELS[key] ?? key} ${numberFormatter.format(value)}`
    )
    .join(" · ");
}

function platformAccent(platform: SocialPlatform): string {
  if (platform === "twitter") {
    return "border-l-sky-500";
  }

  if (platform === "threads") {
    return "border-l-fuchsia-500";
  }

  return "border-l-rose-500";
}

export function SocialMediaResultCards({ message }: { message: UIMessage }) {
  const result = getSocialPreviews(message);

  if (!result) {
    return null;
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-2">
      <p className="text-muted-foreground text-xs font-medium">
        Sorotan sumber
      </p>
      {result.previews.map((preview, index) => {
        const metrics = formatMetrics(preview.metrics);
        const label = PLATFORM_LABELS[result.platform];

        return (
          <article
            key={preview.url ?? `${result.platform}-${index}`}
            className={cn(
              "bg-card grid min-h-32 grid-cols-[7rem_minmax(0,1fr)] overflow-hidden rounded-lg border border-l-4 sm:grid-cols-[10rem_minmax(0,1fr)]",
              platformAccent(result.platform)
            )}
          >
            {preview.imageUrl ? (
              <div
                role="img"
                aria-label={`Gambar postingan ${label}`}
                className="bg-muted h-full min-h-32 bg-cover bg-center"
                style={{ backgroundImage: `url("${preview.imageUrl}")` }}
              />
            ) : (
              <div className="bg-muted text-muted-foreground flex min-h-32 items-center justify-center">
                <MessageCircle className="size-7" />
              </div>
            )}
            <div className="flex min-w-0 flex-col justify-center px-3 py-2.5">
              <p className="text-muted-foreground text-xs font-medium">
                {label}
              </p>
              {preview.author ? (
                <p className="mt-0.5 truncate text-sm font-semibold">
                  {preview.author.startsWith("@")
                    ? preview.author
                    : `@${preview.author}`}
                </p>
              ) : null}
              <p className="mt-1 line-clamp-3 text-sm leading-relaxed">
                {preview.text ?? preview.title ?? "Postingan tanpa teks"}
              </p>
              {metrics ? (
                <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">
                  {metrics}
                </p>
              ) : null}
              {preview.url ? (
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary mt-1.5 inline-flex w-fit items-center gap-1 text-xs font-medium hover:underline"
                >
                  Buka postingan
                  <ExternalLink className="size-3" />
                </a>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
