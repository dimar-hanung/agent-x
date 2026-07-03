"use client";

import {
  AlertCircle,
  ArrowUp,
  Bot,
  CheckCircle2,
  Loader2,
  Menu,
  Sparkles,
  SquarePen,
  User,
  Wrench,
} from "lucide-react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  getToolName,
  isToolUIPart,
  type UIMessage,
} from "ai";
import * as React from "react";
import { useRouter } from "next/navigation";

import { MessageMarkdown } from "@/components/chat/message-markdown";
import { ExaSourceCards } from "@/components/chat/exa-source-cards";
import {
  ExaToolChip,
  isExaToolPart,
} from "@/components/chat/exa-tool-chip";
import { ExaUnavailableBanner } from "@/components/chat/exa-unavailable-banner";
import { useChatSidebar } from "@/components/chat/chat-shell";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import {
  SCHEDULE_RUN_COMPLETE_EVENT,
  type ScheduleRunCompleteDetail,
} from "@/lib/scheduler/schedule-run-events";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  id?: string;
  initialMessages?: UIMessage[];
  exaConfigured?: boolean;
  hasExaTools?: boolean;
}

const BASE_SUGGESTIONS = [
  "What time is it?",
  "Echo hello",
  "What tools can I use?",
];

const EXA_SUGGESTION = "Cari berita AI terbaru";

function getSuggestions(hasExaTools: boolean, exaConfigured: boolean): string[] {
  if (hasExaTools && exaConfigured) {
    return [EXA_SUGGESTION, ...BASE_SUGGESTIONS];
  }

  return BASE_SUGGESTIONS;
}

function AssistantAvatar() {
  return (
    <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
      <Bot className="size-4" />
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="border-muted-foreground/20 bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full border">
      <User className="size-4" />
    </div>
  );
}

function TypingDots() {
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
    nodes.push(
      <div
        key={`${message.id}-text-${textRunStart}`}
        className={cn(
          "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs",
          isUser
            ? "bg-primary text-primary-foreground whitespace-pre-wrap rounded-tr-sm"
            : "bg-muted rounded-tl-sm"
        )}
      >
        {isUser ? textRun : <MessageMarkdown content={textRun} />}
      </div>
    );
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

export function ChatPanel({
  id,
  initialMessages = [],
  exaConfigured = false,
  hasExaTools = false,
}: ChatPanelProps) {
  const router = useRouter();
  const { setMobileOpen } = useChatSidebar();
  const suggestions = getSuggestions(hasExaTools, exaConfigured);

  const [draftId] = React.useState<string>(() => crypto.randomUUID());
  const chatId = id ?? draftId;
  const navigatedRef = React.useRef(false);

  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ id: sendChatId, messages: allMessages }) => ({
        body: {
          id: sendChatId,
          message: allMessages.at(-1),
        },
      }),
    }),
  });

  const isReady = status === "ready";
  const hasMessages = messages.length > 0;
  const lastMessage = messages.at(-1);
  const lastAssistantHasText =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.some(
      (part) => part.type === "text" && part.text.length > 0
    );
  const refreshedScheduleTools = React.useRef(new Set<string>());

  React.useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts) {
        if (!isToolUIPart(part)) {
          continue;
        }

        const toolName = getToolName(part);

        if (toolName !== "create_schedule" && toolName !== "cancel_schedule") {
          continue;
        }

        if (part.state !== "output-available") {
          continue;
        }

        const toolKey = part.toolCallId ?? `${message.id}-${toolName}`;

        if (refreshedScheduleTools.current.has(toolKey)) {
          continue;
        }

        refreshedScheduleTools.current.add(toolKey);
        router.refresh();
      }
    }
  }, [messages, router]);

  React.useEffect(() => {
    if (!id || status !== "ready") {
      return;
    }

    async function syncScheduledMessages(event: Event) {
      const detail = (event as CustomEvent<ScheduleRunCompleteDetail>).detail;

      if (!detail?.chatId || detail.chatId !== id) {
        return;
      }

      try {
        const response = await fetch(`/api/chats/${id}/messages`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const body = (await response.json()) as { messages: UIMessage[] };
        setMessages(body.messages ?? []);
      } catch {
        // Ignore transient sync errors; the next poll will retry.
      }
    }

    window.addEventListener(SCHEDULE_RUN_COMPLETE_EVENT, syncScheduledMessages);

    return () => {
      window.removeEventListener(
        SCHEDULE_RUN_COMPLETE_EVENT,
        syncScheduledMessages
      );
    };
  }, [id, setMessages, status]);

  const prevStatusRef = React.useRef(status);

  React.useEffect(() => {
    if (
      !id &&
      prevStatusRef.current === "streaming" &&
      status === "ready" &&
      messages.length > 0 &&
      !navigatedRef.current
    ) {
      navigatedRef.current = true;
      router.replace(`/chat/${chatId}`);
      router.refresh();
    }
    prevStatusRef.current = status;
  }, [id, status, messages.length, chatId, router]);

  const adjustTextarea = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 192)}px`;
  }, []);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, status]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !isReady) return;
    sendMessage({ text: trimmed });
    setInput("");
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) el.style.height = "auto";
    });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send(input);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col">
      <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 flex h-14 shrink-0 items-center gap-2 border-b px-3 backdrop-blur md:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open chat history"
        >
          <Menu className="size-5" />
        </Button>

        <AssistantAvatar />

        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">{siteConfig.name}</span>
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "size-1.5 rounded-full",
                isReady ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
              )}
            />
            {isReady ? "Online" : "Thinking..."}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={() => router.push(`/chat?new=${Date.now()}`)}
          aria-label="New chat"
        >
          <SquarePen className="size-4" />
        </Button>
      </header>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {hasMessages ? (
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              const isLast = index === messages.length - 1;
              const showInlineTyping =
                !isUser &&
                isLast &&
                status === "streaming" &&
                !lastAssistantHasText;

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    isUser ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {isUser ? <UserAvatar /> : <AssistantAvatar />}

                  <div
                    className={cn(
                      "flex max-w-[85%] flex-col gap-2",
                      isUser ? "items-end" : "items-start"
                    )}
                  >
                    <MessageContent message={message} isUser={isUser} />

                    {showInlineTyping ? (
                      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 shadow-xs">
                        <TypingDots />
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {status === "submitted" ? (
              <div className="flex flex-row gap-3">
                <AssistantAvatar />
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 shadow-xs">
                  <TypingDots />
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
            <div className="bg-primary text-primary-foreground flex size-14 items-center justify-center rounded-2xl shadow-sm">
              <Sparkles className="size-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-semibold tracking-tight">
                How can I help today?
              </h2>
              <p className="text-muted-foreground text-sm">
                Ask anything, or try one of the suggestions below.
              </p>
            </div>
            <div className="flex w-full max-w-sm flex-col gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  disabled={!isReady}
                  className="bg-card hover:bg-accent hover:border-foreground/20 rounded-xl border px-4 py-3 text-left text-sm transition-colors disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-background shrink-0 border-t">
        <div className="mx-auto w-full max-w-3xl px-4 py-3">
          {hasExaTools && !exaConfigured ? <ExaUnavailableBanner /> : null}

          {error ? (
            <p className="text-destructive mb-2 flex items-center gap-2 text-sm">
              <span className="bg-destructive/10 text-destructive flex size-5 items-center justify-center rounded-full">
                <AlertCircle className="size-3.5" />
              </span>
              {error.message || "Something went wrong. Please try again."}
            </p>
          ) : null}

          <div className="bg-card focus-within:border-ring/40 focus-within:ring-ring/30 flex items-end gap-2 rounded-2xl border px-3 py-2 shadow-xs transition focus-within:ring-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                adjustTextarea();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={1}
              disabled={!isReady}
              autoComplete="off"
              className="text-foreground placeholder:text-muted-foreground max-h-48 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none disabled:opacity-50"
            />
            <Button
              type="button"
              size="icon"
              className="rounded-full"
              onClick={() => send(input)}
              disabled={!isReady || !input.trim()}
              aria-label="Send message"
            >
              {isReady ? (
                <ArrowUp className="size-4" />
              ) : (
                <Loader2 className="size-4 animate-spin" />
              )}
            </Button>
          </div>

          <p className="text-muted-foreground mt-1.5 text-center text-xs">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </section>
  );
}
