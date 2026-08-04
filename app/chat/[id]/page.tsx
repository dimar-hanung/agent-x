import { notFound, redirect } from "next/navigation";

import { ChatPanel } from "@/components/chat/chat-panel";
import { userHasWebSearchTools } from "@/lib/ai/roles/tools-by-role";
import {
  getWebSearchMissingEnvKey,
  isWebSearchConfiguredForProvider,
} from "@/lib/ai/web-search/is-configured";
import { getVoiceConfig } from "@/lib/ai/voice";
import { getModelSettings } from "@/lib/admin/model-settings/repository";
import type { WebSearchProviderId } from "@/lib/admin/model-settings/constants";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { loadChatMessagesPage } from "@/lib/db/repositories/chat-repository";
import { siteConfig, appRoutes } from "@/lib/site-config";

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
    redirect(`/login?next=${appRoutes.chat}`);
  }

  const { id } = await params;

  let initialMessages;
  let initialHasMore = false;
  let initialOldestSequence: number | null = null;
  let initialSequences: Array<{ id: string; sequence: number }> = [];

  try {
    const page = await loadChatMessagesPage(id, user.userId, { limit: 30 });
    initialMessages = page.messages.map(({ sequence: _sequence, ...message }) => message);
    initialHasMore = page.hasMore;
    initialOldestSequence = page.oldestSequence;
    initialSequences = page.messages.map((message) => ({
      id: message.id,
      sequence: message.sequence,
    }));
  } catch {
    notFound();
  }

  const modelSettings = await getModelSettings();
  const voiceConfig = getVoiceConfig(modelSettings);
  const webSearchProvider = modelSettings.webSearchProvider as WebSearchProviderId;

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <ChatPanel
        id={id}
        initialMessages={initialMessages}
        initialHasMore={initialHasMore}
        initialOldestSequence={initialOldestSequence}
        initialSequences={initialSequences}
        webSearchConfigured={isWebSearchConfiguredForProvider(webSearchProvider)}
        webSearchMissingEnvKey={getWebSearchMissingEnvKey(webSearchProvider)}
        hasWebSearchTools={userHasWebSearchTools(user.role)}
        voiceInputEnabled={voiceConfig.inputEnabled}
        voiceInputMaxSeconds={voiceConfig.inputMaxSeconds}
      />
    </main>
  );
}
