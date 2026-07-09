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
import { GmailIntegrationCard } from "@/components/settings/gmail-integration-card";
import { WhatsAppPairingCard } from "@/components/settings/whatsapp-pairing-card";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { getGmailIntegrationStatus } from "@/lib/integrations/gmail-repository";
import { getUserPairingStatus } from "@/lib/integrations/whatsapp-channel-repository";

export default async function SettingsPage() {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  const [gmailStatus, whatsappStatus] = await Promise.all([
    getGmailIntegrationStatus(user.userId),
    getUserPairingStatus(user.userId),
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
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Integrations</h1>
          <p className="text-muted-foreground text-sm">
            Hubungkan layanan eksternal untuk dipakai di tool chat.
          </p>
        </div>
        <div className="grid max-w-3xl gap-4 md:grid-cols-2">
          <GmailIntegrationCard initialStatus={gmailStatus} />
          <WhatsAppPairingCard initialStatus={whatsappStatus} />
        </div>
      </div>
    </>
  );
}
