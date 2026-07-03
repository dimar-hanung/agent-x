import { redirect } from "next/navigation";

import { ChatShell } from "@/components/chat/chat-shell";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { listChatsForUser } from "@/lib/db/repositories/chat-repository";
import { listActiveSchedulesForUser } from "@/lib/db/repositories/schedule-repository";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login?next=/chat");
  }

  const [chats, schedules] = await Promise.all([
    listChatsForUser(user.userId),
    listActiveSchedulesForUser(user.userId),
  ]);

  return (
    <ChatShell
      chats={chats.map((chat) => ({
        id: chat.id,
        title: chat.title,
        updatedAt: chat.updatedAt.toISOString(),
      }))}
      schedules={schedules.map((schedule) => ({
        id: schedule.id,
        title: schedule.title,
        scheduleKind: schedule.scheduleKind,
        timezone: schedule.timezone,
        nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
        runCount: schedule.runCount,
      }))}
    >
      {children}
    </ChatShell>
  );
}
