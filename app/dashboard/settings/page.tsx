import { Suspense } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
import { getUserInstance } from "@/lib/integrations/whatsapp-inbox/user-instance-repository";

export default async function SettingsPage() {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  const [googleStatus, microsoftStatus, whatsappStatus, whatsappInboxInstance, apiKeys] =
    await Promise.all([
    getGoogleIntegrationStatus(user.userId),
    getMicrosoftIntegrationStatus(user.userId),
    getUserPairingStatus(user.userId),
    getUserInstance(user.userId),
    listApiKeys(user.userId),
  ]);

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="max-w-3xl">
          <h1 className="text-xl font-semibold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground">
            Hubungkan layanan eksternal untuk dipakai di tool chat dan MCP.
          </p>
        </div>
        <div className="divide-border surface-panel max-w-3xl divide-y overflow-hidden rounded-lg border">
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
    </>
  );
}
