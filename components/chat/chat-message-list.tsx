"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import type { UIMessage } from "ai";
import * as React from "react";

import {
  AssistantAvatar,
  MessageRow,
  TypingDots,
} from "@/components/chat/message-row";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ChatMessageListProps {
  chatId?: string;
  messages: UIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
  hasMore: boolean;
  oldestSequence: number | null;
  onLoadOlder: () => Promise<void>;
  isLoadingOlder: boolean;
}

export function ChatMessageList({
  chatId,
  messages,
  status,
  hasMore,
  oldestSequence,
  onLoadOlder,
  isLoadingOlder,
}: ChatMessageListProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const topSentinelRef = React.useRef<HTMLDivElement>(null);
  const [showJumpToLatest, setShowJumpToLatest] = React.useState(false);
  const loadingOlderRef = React.useRef(false);

  const lastMessage = messages.at(-1);
  const lastAssistantHasText =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.some(
      (part) => part.type === "text" && part.text.length > 0
    );

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 96,
    getItemKey: (index) => messages[index]?.id ?? index,
    anchorTo: "end",
    followOnAppend: true,
    scrollEndThreshold: 80,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  React.useEffect(() => {
    virtualizer.scrollToEnd({ behavior: "auto" });
  }, []);

  React.useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    function handleScroll() {
      setShowJumpToLatest(!virtualizer.isAtEnd(120));
    }

    el.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, [virtualizer, messages.length]);

  React.useEffect(() => {
    if (!chatId || !hasMore || oldestSequence === null) {
      return;
    }

    const sentinel = topSentinelRef.current;
    const root = parentRef.current;

    if (!sentinel || !root) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (
          !entry?.isIntersecting ||
          loadingOlderRef.current ||
          isLoadingOlder
        ) {
          return;
        }

        loadingOlderRef.current = true;
        void onLoadOlder().finally(() => {
          loadingOlderRef.current = false;
        });
      },
      { root, rootMargin: "120px", threshold: 0 }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [chatId, hasMore, oldestSequence, onLoadOlder, isLoadingOlder]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={parentRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
          {hasMore ? (
            <div
              ref={topSentinelRef}
              className="text-muted-foreground flex items-center justify-center py-3 text-xs"
            >
              {isLoadingOlder ? "Memuat pesan lama..." : null}
            </div>
          ) : null}

          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualItems.map((virtualRow) => {
              const message = messages[virtualRow.index];
              const isLast = virtualRow.index === messages.length - 1;
              const showInlineTyping =
                !isLast
                  ? false
                  : message.role === "assistant" &&
                    status === "streaming" &&
                    !lastAssistantHasText;

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  className="absolute top-0 left-0 w-full"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <MessageRow
                    message={message}
                    showInlineTyping={showInlineTyping}
                  />
                </div>
              );
            })}
          </div>

          {status === "submitted" ? (
            <div className="flex flex-row gap-3 px-4 py-3">
              <AssistantAvatar />
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 shadow-xs">
                <TypingDots />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {showJumpToLatest ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className={cn("pointer-events-auto shadow-md")}
            onClick={() => virtualizer.scrollToEnd({ behavior: "smooth" })}
          >
            Pesan terbaru
          </Button>
        </div>
      ) : null}
    </div>
  );
}
