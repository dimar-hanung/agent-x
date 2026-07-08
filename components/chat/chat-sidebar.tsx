"use client";

import { MessageSquare, Plus, Radio, SquareTerminal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { IndonesianFlagIcon } from "@/components/icons/indonesian-flag-icon";
import { ScheduleList, type ScheduleListItem } from "@/components/chat/schedule-list";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { siteConfig, appRoutes } from "@/lib/site-config";
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
    router.push(`${appRoutes.chat}?new=${Date.now()}`);
  }

  return (
    <aside className="bg-muted/40 flex h-full w-72 shrink-0 flex-col border-r">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <IndonesianFlagIcon className="size-7" />
        <span className="font-semibold tracking-tight">{siteConfig.name}</span>
      </div>

      <div className="flex shrink-0 flex-col gap-2 p-3">
        <Button variant="outline" size="lg" className="w-full justify-start gap-2" asChild>
          <Link href={appRoutes.dashboard} onClick={onNavigate}>
            <SquareTerminal className="size-5" />
            Dashboard
          </Link>
        </Button>
        <Button
          size="lg"
          className="w-full justify-start gap-2"
          onClick={handleNewChat}
        >
          <Plus className="size-5" />
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
              href={`${appRoutes.chat}/${mainChannel.id}`}
              onClick={onNavigate}
              aria-current={activeChatId === mainChannel.id ? "page" : undefined}
              className={cn(
                "hover:bg-muted relative flex items-center gap-3 rounded-lg px-3 py-3 text-base transition-colors",
                activeChatId === mainChannel.id && "bg-muted"
              )}
            >
              {activeChatId === mainChannel.id ? (
                <span className="bg-primary absolute top-1/2 left-0 h-7 w-1 -translate-y-1/2 rounded-r-full" />
              ) : null}
              <Radio className="text-primary size-5 shrink-0" />
              <span className="line-clamp-2 flex-1 leading-snug font-medium">
                {mainChannel.title}
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
                href={`${appRoutes.chat}/${chat.id}`}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "hover:bg-muted relative flex items-center gap-3 rounded-lg px-3 py-3 text-base transition-colors",
                  active && "bg-muted"
                )}
              >
                {active ? (
                  <span className="bg-primary absolute top-1/2 left-0 h-7 w-1 -translate-y-1/2 rounded-r-full" />
                ) : null}
                <MessageSquare className="text-muted-foreground size-5 shrink-0" />
                <span className="line-clamp-2 flex-1 leading-snug">
                  {chat.title}
                </span>
              </Link>
            );
          })
        )}
      </nav>

      <ScheduleList schedules={schedules} />

      <div className="flex shrink-0 items-center justify-between border-t p-3 px-4">
        <span className="text-muted-foreground text-xs">Theme</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
