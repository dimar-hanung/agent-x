import { notFound, redirect } from "next/navigation";

import { ChatPanel } from "@/components/chat/chat-panel";
import { isExaConfigured } from "@/lib/ai/exa/env";
import { userHasExaTools } from "@/lib/ai/roles/tools-by-role";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { loadChatMessages } from "@/lib/db/repositories/chat-repository";
import { siteConfig } from "@/lib/site-config";

export const metadata = {
  title: `Chat | ${siteConfig.name}`,
  description: `Chat with the ${siteConfig.name} assistant.`,
};

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login?next=/chat");
  }

  const { id } = await params;

  let initialMessages;

  try {
    initialMessages = await loadChatMessages(id, user.userId);
  } catch {
    notFound();
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <ChatPanel
        id={id}
        initialMessages={initialMessages}
        exaConfigured={isExaConfigured()}
        hasExaTools={userHasExaTools(user.role)}
      />
    </main>
  );
}
