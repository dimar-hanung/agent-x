"use client";

import { ExternalLink } from "lucide-react";
import { getToolName, isToolUIPart, type UIMessage } from "ai";

interface ExaSource {
  title: string;
  url: string;
  snippet: string;
  publishedDate?: string;
}

interface SearchOutput {
  success?: boolean;
  data?: {
    sources?: ExaSource[];
  };
}

function getSearchSources(part: UIMessage["parts"][number]): ExaSource[] {
  if (!isToolUIPart(part)) {
    return [];
  }

  if (getToolName(part) !== "exa_web_search") {
    return [];
  }

  if (part.state !== "output-available" || !("output" in part)) {
    return [];
  }

  const output = part.output as SearchOutput | undefined;

  if (!output?.success || !output.data?.sources) {
    return [];
  }

  return output.data.sources;
}

interface ExaSourceCardsProps {
  part: UIMessage["parts"][number];
}

export function ExaSourceCards({ part }: ExaSourceCardsProps) {
  const sources = getSearchSources(part);

  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-2">
      <p className="text-muted-foreground text-xs font-medium">Sumber</p>
      <div className="flex flex-col gap-2">
        {sources.map((source) => (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-card hover:bg-accent group rounded-lg border px-3 py-2 text-left transition-colors"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="group-hover:text-primary line-clamp-1 text-sm font-medium">
                  {source.title}
                </p>
                <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
                  {source.url}
                </p>
                {source.snippet ? (
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
                    {source.snippet}
                  </p>
                ) : null}
              </div>
              <ExternalLink className="text-muted-foreground mt-0.5 size-3.5 shrink-0 opacity-60" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
