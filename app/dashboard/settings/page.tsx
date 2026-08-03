import { Suspense } from "react";

import { ApiKeyIntegrationCard } from "@/components/settings/api-key-integration-card";
import { GoogleIntegrationCard } from "@/components/settings/google-integration-card";
import { MicrosoftIntegrationCard } from "@/components/settings/microsoft-integration-card";
import { WhatsAppInboxConnectCard } from "@/components/settings/whatsapp-inbox-connect-card";
import { WhatsAppPairingCard } from "@/components/settings/whatsapp-pairing-card";
import { listApiKeys } from "@/lib/api-keys/repository";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { getGoogleIntegrationStatus } from "@/lib/integrations/google-repository";
import { getMicrosoftIntegrationStatus } from "@/lib/integrations/microsoft-repository";
import { getUserPairingStatus } from "@/lib/integrations/whatsapp-channel-repository";
import {
  getUserInstance,
  syncUserConnectionStatus,
} from "@/lib/integrations/whatsapp-inbox/user-instance-repository";

export default async function SettingsIntegrationsPage() {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  const [googleStatus, microsoftStatus, whatsappStatus, whatsappInboxInstance, apiKeys] =
    await Promise.all([
      getGoogleIntegrationStatus(user.userId),
      getMicrosoftIntegrationStatus(user.userId),
      getUserPairingStatus(user.userId),
      (async () => {
        try {
          return await syncUserConnectionStatus(user.userId);
        } catch {
          return await getUserInstance(user.userId);
        }
      })(),
      listApiKeys(user.userId),
    ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Integrasi</h1>
        <p className="text-muted-foreground">
          Hubungkan layanan eksternal untuk dipakai di tool chat dan MCP.
        </p>
      </div>
      <div className="divide-border surface-panel divide-y overflow-hidden rounded-lg border">
        <Suspense fallback={null}>
          <GoogleIntegrationCard
            initialStatus={googleStatus}
            otherProviderConnected={microsoftStatus.connected}
          />
        </Suspense>
        <Suspense fallback={null}>
          <MicrosoftIntegrationCard
            initialStatus={microsoftStatus}
            otherProviderConnected={googleStatus.connected}
          />
        </Suspense>
        <WhatsAppPairingCard initialStatus={whatsappStatus} />
        <WhatsAppInboxConnectCard initialInstance={whatsappInboxInstance} />
        <ApiKeyIntegrationCard initialKeys={apiKeys} />
      </div>
    </div>
  );
}
