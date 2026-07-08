"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { ChatSidebar } from "@/components/chat/chat-sidebar";
import type { ScheduleListItem } from "@/components/chat/schedule-list";
import { useScheduleRunListener } from "@/hooks/use-schedule-run-listener";
import { appRoutes } from "@/lib/site-config";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

interface ChatShellProps {
  mainChannel: { id: string; title: string; updatedAt: string } | null;
  chats: Array<{ id: string; title: string; updatedAt: string }>;
  schedules: ScheduleListItem[];
  children: React.ReactNode;
}

interface ChatSidebarContextValue {
  mobileOpen: boolean;
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ChatSidebarContext = React.createContext<ChatSidebarContextValue | null>(
  null
);

export function useChatSidebar() {
  const context = React.useContext(ChatSidebarContext);

  if (!context) {
    throw new Error("useChatSidebar must be used within a ChatShell.");
  }

  return context;
}

export function ChatShell({ mainChannel, chats, schedules, children }: ChatShellProps) {
  const pathname = usePathname();
  const activeChatId = pathname.startsWith(`${appRoutes.chat}/`)
    ? pathname.split("/")[2]
    : undefined;

  const [mobileOpen, setMobileOpen] = React.useState(false);

  useScheduleRunListener(true);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [activeChatId]);

  return (
    <ChatSidebarContext.Provider value={{ mobileOpen, setMobileOpen }}>
      <div className="flex h-svh w-full overflow-hidden">
        <div className="hidden h-full md:flex">
          <ChatSidebar
            mainChannel={mainChannel}
            chats={chats}
            schedules={schedules}
            activeChatId={activeChatId}
          />
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" showCloseButton={false} className="w-72 p-0">
            <SheetTitle className="sr-only">Chat history</SheetTitle>
            <ChatSidebar
              mainChannel={mainChannel}
              chats={chats}
              schedules={schedules}
              activeChatId={activeChatId}
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </ChatSidebarContext.Provider>
  );
}
