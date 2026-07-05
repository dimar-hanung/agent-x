"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Plus, Radio, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ScheduleList, type ScheduleListItem } from "@/components/chat/schedule-list";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

interface ChatHistoryItem {
  id: string;
  title: string;
  updatedAt: string;
}

interface ChatSidebarProps {
  mainChannel: ChatHistoryItem | null;
  chats: ChatHistoryItem[];
  schedules: ScheduleListItem[];
  activeChatId?: string;
  onNavigate?: () => void;
}

/** Fixed locale so SSR and client render identical date strings. */
const DATE_LOCALE = "id-ID";

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE, {
    month: "short",
    day: "numeric",
  });
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return formatShortDate(iso);
}

function RelativeTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setLabel(formatRelativeTime(iso));
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [iso]);

  if (label === null) {
    return formatShortDate(iso);
  }

  return label;
}

export function ChatSidebar({
  mainChannel,
  chats,
  schedules,
  activeChatId,
  onNavigate,
}: ChatSidebarProps) {
  const router = useRouter();

  function handleNewChat() {
    onNavigate?.();
    router.push(`/chat?new=${Date.now()}`);
  }

  return (
    <aside className="bg-muted/40 flex h-full w-72 shrink-0 flex-col border-r">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg">
          <Sparkles className="size-4" />
        </div>
        <span className="font-semibold tracking-tight">{siteConfig.name}</span>
      </div>

      <div className="shrink-0 p-3">
        <Button
          className="w-full justify-start gap-2"
          onClick={handleNewChat}
        >
          <Plus className="size-4" />
          Chat baru
        </Button>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
        {mainChannel ? (
          <>
            <p className="text-muted-foreground px-2 pb-1 pt-2 text-xs font-medium tracking-wider uppercase">
              Kanal
            </p>
            <Link
              href={`/chat/${mainChannel.id}`}
              onClick={onNavigate}
              aria-current={activeChatId === mainChannel.id ? "page" : undefined}
              className={cn(
                "hover:bg-muted relative flex flex-col gap-0.5 rounded-lg px-3 py-2 text-sm transition-colors",
                activeChatId === mainChannel.id && "bg-muted"
              )}
            >
              {activeChatId === mainChannel.id ? (
                <span className="bg-primary absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full" />
              ) : null}
              <span className="flex items-start gap-2">
                <Radio className="text-primary mt-0.5 size-4 shrink-0" />
                <span className="line-clamp-2 flex-1 leading-snug font-medium">
                  {mainChannel.title}
                </span>
              </span>
              <span className="text-muted-foreground pl-6 text-xs">
                <RelativeTime iso={mainChannel.updatedAt} />
              </span>
            </Link>
          </>
        ) : null}

        <p className="text-muted-foreground px-2 pb-1 pt-2 text-xs font-medium tracking-wider uppercase">
          Terbaru
        </p>

        {chats.length === 0 ? (
          <p className="text-muted-foreground px-2 py-3 text-sm">
            Belum ada chat. Mulai percakapan baru.
          </p>
        ) : (
          chats.map((chat) => {
            const active = activeChatId === chat.id;

            return (
              <Link
                key={chat.id}
                href={`/chat/${chat.id}`}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "hover:bg-muted relative flex flex-col gap-0.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active && "bg-muted"
                )}
              >
                {active ? (
                  <span className="bg-primary absolute top-1/2 left-0 h-6 w-1 -translate-y-1/2 rounded-r-full" />
                ) : null}
                <span className="flex items-start gap-2">
                  <MessageSquare className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <span className="line-clamp-2 flex-1 leading-snug">
                    {chat.title}
                  </span>
                </span>
                <span className="text-muted-foreground pl-6 text-xs">
                  <RelativeTime iso={chat.updatedAt} />
                </span>
              </Link>
            );
          })
        )}
      </nav>

      <ScheduleList schedules={schedules} />

      <div className="flex shrink-0 items-center justify-between border-t px-4 py-3">
        <span className="text-muted-foreground text-xs">Theme</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
