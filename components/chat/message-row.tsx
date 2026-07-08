"use client";

import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Loader2,
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

function ToolChip({ part }: { part: UIMessage["parts"][number] }) {
  if (!isToolUIPart(part)) {
    return null;
  }

  const toolName = getToolName(part);
  const state = part.state;
  const isRunning = state !== "output-available" && state !== "output-error";

  const Icon =
    state === "output-error"
      ? AlertCircle
      : isRunning
        ? Loader2
        : CheckCircle2;
  const label =
    state === "output-error" ? "error" : isRunning ? "running" : "done";

  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5 rounded-md border bg-background/60 px-2 py-1 text-xs">
      <Wrench className="size-3" />
      <span className="font-medium">{toolName}</span>
      <span className="inline-flex items-center gap-1 opacity-70">
        <Icon className={cn("size-3", isRunning && "animate-spin")} />
        {label}
      </span>
    </span>
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
        ? "Terjadwal"
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
        <MessageContent message={message} isUser={isUser} />
        {showInlineTyping ? <TypingDots /> : null}
      </div>
    </div>
  );
}

export { AssistantAvatar };
