import { redirect } from "next/navigation";

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

  const modelSettings = await getModelSettings();
  const voiceConfig = getVoiceConfig(modelSettings);
  const webSearchProvider = modelSettings.webSearchProvider as WebSearchProviderId;

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <ChatPanel
        key={draftKey ?? ""}
        webSearchConfigured={isWebSearchConfiguredForProvider(webSearchProvider)}
        webSearchMissingEnvKey={getWebSearchMissingEnvKey(webSearchProvider)}
        hasWebSearchTools={userHasWebSearchTools(user.role)}
        voiceInputEnabled={voiceConfig.inputEnabled}
        voiceInputMaxSeconds={voiceConfig.inputMaxSeconds}
      />
    </main>
  );
}
