import { redirect } from "next/navigation";

import { ChatPanel } from "@/components/chat/chat-panel";
import { isExaConfigured } from "@/lib/ai/exa/env";
import { userHasExaTools } from "@/lib/ai/roles/tools-by-role";
import { getSessionUser } from "@/lib/auth/get-session-user";
import {
  getMainChannelId,
  getOrCreateMainChannel,
} from "@/lib/db/repositories/channel-repository";
import { siteConfig, appRoutes } from "@/lib/site-config";

export const metadata = {
  title: `Chat | ${siteConfig.name}`,
  description: `Chat with the ${siteConfig.name} assistant.`,
};

export default async function ChatIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect(`/login?next=${appRoutes.chat}`);
  }

  const { new: draftKey } = await searchParams;

  if (!draftKey) {
    const mainChannelId =
      (await getMainChannelId(user.userId)) ??
      (await getOrCreateMainChannel(user.userId));
    redirect(`${appRoutes.chat}/${mainChannelId}`);
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <ChatPanel
        key={draftKey ?? ""}
        exaConfigured={isExaConfigured()}
        hasExaTools={userHasExaTools(user.role)}
      />
    </main>
  );
}
