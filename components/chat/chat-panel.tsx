"use client";

import {
  AlertCircle,
  ArrowUp,
  Loader2,
  Menu,
  SquarePen,
} from "lucide-react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  isToolUIPart,
  getToolName,
  type UIMessage,
} from "ai";
import * as React from "react";
import { useRouter } from "next/navigation";

import { ChatMessageList } from "@/components/chat/chat-message-list";
import { ExaUnavailableBanner } from "@/components/chat/exa-unavailable-banner";
import { useChatSidebar } from "@/components/chat/chat-shell";
import { IndonesianFlagIcon } from "@/components/icons/indonesian-flag-icon";
import { Button } from "@/components/ui/button";
import { siteConfig, appRoutes } from "@/lib/site-config";
import {
  SCHEDULE_RUN_COMPLETE_EVENT,
  type ScheduleRunCompleteDetail,
} from "@/lib/scheduler/schedule-run-events";
import { cn } from "@/lib/utils";
import { AssistantAvatar } from "@/components/chat/message-row";

interface ChatPanelProps {
  id?: string;
  initialMessages?: UIMessage[];
  initialHasMore?: boolean;
  initialOldestSequence?: number | null;
  initialSequences?: Array<{ id: string; sequence: number }>;
  exaConfigured?: boolean;
  hasExaTools?: boolean;
}

const BASE_SUGGESTIONS = [
  "Jam berapa sekarang di Asia/Jakarta?",
  "Tampilkan todo saya",
  "Ingat bahwa saya prefer Bahasa Indonesia",
];

const EXA_SUGGESTION = "Cari berita AI terbaru";

function getSuggestions(hasExaTools: boolean, exaConfigured: boolean): string[] {
  if (hasExaTools && exaConfigured) {
    return [EXA_SUGGESTION, ...BASE_SUGGESTIONS];
  }

  return BASE_SUGGESTIONS;
}

export function ChatPanel({
  id,
  initialMessages = [],
  initialHasMore = false,
  initialOldestSequence = null,
  initialSequences = [],
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
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const [olderMessages, setOlderMessages] = React.useState<UIMessage[]>([]);
  const [hasMore, setHasMore] = React.useState(initialHasMore);
  const [oldestSequence, setOldestSequence] = React.useState<number | null>(
    initialOldestSequence
  );
  const [isLoadingOlder, setIsLoadingOlder] = React.useState(false);

  const sequenceByIdRef = React.useRef(new Map<string, number>());

  React.useEffect(() => {
    const map = sequenceByIdRef.current;
    map.clear();

    for (const entry of initialSequences) {
      map.set(entry.id, entry.sequence);
    }
  }, [id, initialSequences]);

  const { messages: liveMessages, sendMessage, status, error, setMessages } =
    useChat({
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

  React.useEffect(() => {
    let nextSequence =
      sequenceByIdRef.current.size > 0
        ? Math.max(...sequenceByIdRef.current.values())
        : -1;

    for (const message of liveMessages) {
      if (!sequenceByIdRef.current.has(message.id)) {
        nextSequence += 1;
        sequenceByIdRef.current.set(message.id, nextSequence);
      }
    }
  }, [liveMessages]);

  const displayMessages = React.useMemo(
    () => [...olderMessages, ...liveMessages],
    [olderMessages, liveMessages]
  );

  const isReady = status === "ready";
  const hasMessages = displayMessages.length > 0;
  const refreshedScheduleTools = React.useRef(new Set<string>());

  const loadOlderMessages = React.useCallback(async () => {
    if (!id || !hasMore || oldestSequence === null || isLoadingOlder) {
      return;
    }

    setIsLoadingOlder(true);

    try {
      const response = await fetch(
        `/api/chats/${id}/messages?before=${oldestSequence}&limit=30`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        return;
      }

      const body = (await response.json()) as {
        messages: UIMessage[];
        sequences?: Array<{ id: string; sequence: number }>;
        hasMore: boolean;
        oldestSequence: number | null;
      };

      for (const entry of body.sequences ?? []) {
        sequenceByIdRef.current.set(entry.id, entry.sequence);
      }

      setOlderMessages((current) => [...(body.messages ?? []), ...current]);
      setHasMore(body.hasMore);
      setOldestSequence(body.oldestSequence);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [id, hasMore, oldestSequence, isLoadingOlder]);

  React.useEffect(() => {
    for (const message of liveMessages) {
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
  }, [liveMessages, router]);

  React.useEffect(() => {
    if (!id || status !== "ready") {
      return;
    }

    async function syncScheduledMessages(event: Event) {
      const detail = (event as CustomEvent<ScheduleRunCompleteDetail>).detail;

      if (!detail?.chatId || detail.chatId !== id) {
        return;
      }

      const maxSequence = Math.max(0, ...sequenceByIdRef.current.values());

      try {
        const response = await fetch(
          `/api/chats/${id}/messages?after=${maxSequence}&limit=10`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          return;
        }

        const body = (await response.json()) as {
          messages: UIMessage[];
          sequences?: Array<{ id: string; sequence: number }>;
        };

        if (!body.messages?.length) {
          return;
        }

        for (const entry of body.sequences ?? []) {
          sequenceByIdRef.current.set(entry.id, entry.sequence);
        }

        setMessages((current) => {
          const existingIds = new Set(current.map((message) => message.id));
          const appended = body.messages.filter(
            (message) => !existingIds.has(message.id)
          );

          return appended.length > 0 ? [...current, ...appended] : current;
        });
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
      liveMessages.length > 0 &&
      !navigatedRef.current
    ) {
      navigatedRef.current = true;
      router.replace(`${appRoutes.chat}/${chatId}`);
      router.refresh();
    }
    prevStatusRef.current = status;
  }, [id, status, liveMessages.length, chatId, router]);

  const adjustTextarea = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 192)}px`;
  }, []);

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
          onClick={() => router.push(`${appRoutes.chat}?new=${Date.now()}`)}
          aria-label="New chat"
        >
          <SquarePen className="size-4" />
        </Button>
      </header>

      {hasMessages ? (
        <ChatMessageList
          chatId={id}
          messages={displayMessages}
          status={status}
          hasMore={hasMore}
          oldestSequence={oldestSequence}
          onLoadOlder={loadOlderMessages}
          isLoadingOlder={isLoadingOlder}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
            <IndonesianFlagIcon className="size-14 shadow-sm" />
            <div className="space-y-1.5">
              <h2 className="text-xl font-semibold tracking-tight">
                Ada yang bisa dibantu?
              </h2>
              <p className="text-muted-foreground text-sm">
                Tanya apa saja, atau coba salah satu saran di bawah.
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
        </div>
      )}

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
