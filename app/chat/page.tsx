import { redirect } from "next/navigation";

import { ChatPanel } from "@/components/chat/chat-panel";
import { isExaConfigured } from "@/lib/ai/exa/env";
import { userHasExaTools } from "@/lib/ai/roles/tools-by-role";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { siteConfig } from "@/lib/site-config";

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
    redirect("/login?next=/chat");
  }

  const { new: draftKey } = await searchParams;

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
