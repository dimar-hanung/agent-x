"use client";

import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Wrench,
} from "lucide-react";
import { getToolName, isToolUIPart, type UIMessage } from "ai";
import * as React from "react";

import { MessageMarkdown } from "@/components/chat/message-markdown";
import { ExaSourceCards } from "@/components/chat/exa-source-cards";
import {
  ExaToolChip,
  isExaToolPart,
} from "@/components/chat/exa-tool-chip";
import { SocialMediaResultCards } from "@/components/chat/social-media-result-cards";
import { toFriendlyToolError } from "@/lib/ai/tools/friendly-tool-error";
import { cn } from "@/lib/utils";

function AssistantAvatar() {
  return (
    <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
      <Bot className="size-4" />
    </div>
  );
}

export function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1.5">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="bg-muted-foreground/60 animate-chat-typing size-1.5 rounded-full"
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </div>
  );
}

function getToolOutputFields(
  part: UIMessage["parts"][number]
): { message: string | null; code: string | null } {
  if (!isToolUIPart(part) || part.state !== "output-available" || !("output" in part)) {
    return { message: null, code: null };
  }

  const output = part.output;
  if (!output || typeof output !== "object") {
    return { message: null, code: null };
  }

  const result = output as { message?: unknown; code?: unknown };
  return {
    message: typeof result.message === "string" ? result.message : null,
    code: typeof result.code === "string" ? result.code : null,
  };
}

function isSoftToolFailure(part: UIMessage["parts"][number]): boolean {
  if (!isToolUIPart(part) || part.state !== "output-available" || !("output" in part)) {
    return false;
  }

  const output = part.output;
  return (
    output !== null &&
    typeof output === "object" &&
    "success" in output &&
    (output as { success?: boolean }).success === false
  );
}

function ToolChip({ part }: { part: UIMessage["parts"][number] }) {
  if (!isToolUIPart(part)) {
    return null;
  }

  const toolName = getToolName(part);
  const state = part.state;
  const isRunning = state !== "output-available" && state !== "output-error";
  const softFailed = isSoftToolFailure(part);
  const hasFailed = state === "output-error" || softFailed;
  const { message, code } = getToolOutputFields(part);
  const errorMessage = hasFailed
    ? toFriendlyToolError({
        toolName,
        message,
        code,
      })
    : null;

  const Icon = hasFailed ? AlertCircle : isRunning ? Loader2 : CheckCircle2;
  const label = hasFailed ? "Gagal" : isRunning ? "Berjalan…" : "Selesai";

  return (
    <div className="flex flex-col gap-1">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
          hasFailed
            ? "border-destructive/30 bg-destructive/5 text-destructive"
            : "text-muted-foreground bg-background/60"
        )}
      >
        <Wrench className="size-3" />
        <span className="font-medium">{toolName}</span>
        <span className="inline-flex items-center gap-1 opacity-70">
          <Icon className={cn("size-3", isRunning && "animate-spin")} />
          {label}
        </span>
      </span>
      {hasFailed && errorMessage ? (
        <p className="text-destructive max-w-md text-xs">{errorMessage}</p>
      ) : null}
    </div>
  );
}

interface ToolOutput {
  success?: boolean;
  message?: string;
}

function getToolInput(
  part: UIMessage["parts"][number]
): Record<string, unknown> | null {
  if (!isToolUIPart(part) || !("input" in part)) {
    return null;
  }

  const input = part.input;

  return input && typeof input === "object"
    ? (input as Record<string, unknown>)
    : null;
}

function getToolOutput(
  part: UIMessage["parts"][number]
): ToolOutput | null {
  if (
    !isToolUIPart(part) ||
    part.state !== "output-available" ||
    !("output" in part)
  ) {
    return null;
  }

  const output = part.output;

  return output && typeof output === "object" ? (output as ToolOutput) : null;
}

function isSocialMediaToolPart(part: UIMessage["parts"][number]): boolean {
  if (!isToolUIPart(part)) {
    return false;
  }

  const name = getToolName(part);
  return (
    name === "fetch_threads_data" ||
    name === "fetch_twitter_data" ||
    name === "fetch_tiktok_data"
  );
}

function readFirstStringArray(
  input: Record<string, unknown> | null,
  keys: string[]
): string[] {
  if (!input) {
    return [];
  }

  for (const key of keys) {
    const value = input[key];

    if (Array.isArray(value)) {
      return value
        .filter(
          (item): item is string =>
            typeof item === "string" && Boolean(item.trim())
        )
        .map((item) => item.trim());
    }

    if (typeof value === "string" && value.trim()) {
      return [value.trim()];
    }
  }

  return [];
}

function SocialMediaToolChip({ part }: { part: UIMessage["parts"][number] }) {
  if (!isToolUIPart(part)) {
    return null;
  }

  const toolName = getToolName(part);
  const input = getToolInput(part);
  const output = getToolOutput(part);
  const state = part.state;
  const isRunning = state !== "output-available" && state !== "output-error";
  const hasFailed =
    state === "output-error" ||
    (output?.success === false && output.message !== undefined);

  const platform =
    toolName === "fetch_threads_data"
      ? "Threads"
      : toolName === "fetch_twitter_data"
        ? "Twitter/X"
        : "TikTok";

  const topics = readFirstStringArray(input, [
    "search_queries",
    "search_query",
    "query",
    "search_terms",
    "content_keywords",
    "content_hashtags",
    "content_cashtags",
    "users_from_users",
    "hashtags",
    "profiles",
    "twitter_handles",
  ]);
  const detail = topics.length > 0 ? topics.slice(0, 3).join(", ") : platform;

  const StatusIcon = hasFailed
    ? AlertCircle
    : isRunning
      ? Loader2
      : CheckCircle2;
  const statusLabel = hasFailed
    ? "Gagal"
    : isRunning
      ? "Mengambil data"
      : "Selesai";
  const errorMessage =
    output?.message ??
    (state === "output-error" ? "Pengambilan data gagal dijalankan." : null);

  return (
    <div className="flex flex-col gap-1">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs",
          hasFailed
            ? "border-destructive/30 bg-destructive/5 text-destructive"
            : "text-muted-foreground bg-background/60"
        )}
      >
        <MessageCircle className="size-3" />
        <span className="font-medium">Media sosial</span>
        <span className="max-w-[12rem] truncate opacity-70">{detail}</span>
        <span className="inline-flex items-center gap-1 opacity-70">
          <StatusIcon className={cn("size-3", isRunning && "animate-spin")} />
          {statusLabel}
        </span>
      </span>
      {hasFailed && errorMessage ? (
        <p className="text-destructive max-w-md text-xs">{errorMessage}</p>
      ) : null}
    </div>
  );
}

function MessageSourceBadge({ message }: { message: UIMessage }) {
  const source =
    message.metadata &&
    typeof message.metadata === "object" &&
    "source" in message.metadata &&
    typeof message.metadata.source === "string"
      ? message.metadata.source
      : null;

  if (!source || source === "web") {
    return null;
  }

  const label =
    source === "whatsapp"
      ? "WhatsApp"
      : source === "scheduler"
        ? "Otomatisasi"
        : source === "apify"
          ? "Media sosial"
          : source;

  return (
    <span className="text-muted-foreground mb-1 inline-block text-xs font-medium">
      {label}
    </span>
  );
}

function MessageContent({
  message,
  isUser,
}: {
  message: UIMessage;
  isUser: boolean;
}) {
  const nodes: React.ReactNode[] = [];
  let textRun = "";
  let textRunStart = 0;
  const toolRun: UIMessage["parts"] = [];
  let toolRunStart = 0;

  const flushTextRun = () => {
    if (!textRun) return;
    if (isUser) {
      nodes.push(
        <div
          key={`${message.id}-text-${textRunStart}`}
          className="bg-muted text-foreground rounded-3xl px-5 py-3 text-sm leading-relaxed whitespace-pre-wrap"
        >
          {textRun}
        </div>
      );
    } else {
      nodes.push(
        <MessageMarkdown
          key={`${message.id}-text-${textRunStart}`}
          content={textRun}
        />
      );
    }
    textRun = "";
  };

  const flushToolRun = () => {
    if (toolRun.length === 0) return;

    const toolNodes: React.ReactNode[] = [];

    for (const [index, part] of toolRun.entries()) {
      const key =
        isToolUIPart(part) && part.toolCallId
          ? part.toolCallId
          : `${message.id}-tool-${toolRunStart + index}`;

      if (isExaToolPart(part)) {
        toolNodes.push(<ExaToolChip key={key} part={part} />);

        if (isToolUIPart(part) && getToolName(part) === "exa_web_search") {
          toolNodes.push(
            <ExaSourceCards key={`${key}-sources`} part={part} />
          );
        }

        continue;
      }

      if (isSocialMediaToolPart(part)) {
        toolNodes.push(<SocialMediaToolChip key={key} part={part} />);
        continue;
      }

      toolNodes.push(<ToolChip key={key} part={part} />);
    }

    nodes.push(
      <div
        key={`${message.id}-tools-${toolRunStart}`}
        className="flex w-full flex-col gap-2"
      >
        {toolNodes}
      </div>
    );
    toolRun.length = 0;
  };

  for (const [index, part] of message.parts.entries()) {
    if (part.type === "text") {
      flushToolRun();
      if (!textRun) textRunStart = index;
      textRun += part.text;
      continue;
    }

    if (isToolUIPart(part)) {
      flushTextRun();
      if (toolRun.length === 0) toolRunStart = index;
      toolRun.push(part);
    }
  }

  flushTextRun();
  flushToolRun();

  return <>{nodes}</>;
}

export interface MessageRowProps {
  message: UIMessage;
  showInlineTyping: boolean;
}

export function MessageRow({
  message,
  showInlineTyping,
}: MessageRowProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end px-4 py-4">
        <div className="flex max-w-[85%] flex-col items-end gap-1">
          <MessageSourceBadge message={message} />
          <MessageContent message={message} isUser={isUser} />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="flex w-full flex-col gap-2">
        <MessageSourceBadge message={message} />
        <SocialMediaResultCards message={message} />
        <MessageContent message={message} isUser={isUser} />
        {showInlineTyping ? <TypingDots /> : null}
      </div>
    </div>
  );
}

export { AssistantAvatar };
