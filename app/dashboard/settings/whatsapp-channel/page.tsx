import { redirect } from "next/navigation";

import { WhatsAppChannelCard } from "@/components/settings/whatsapp-channel-card";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { syncChannelConnectionStatus } from "@/lib/integrations/whatsapp-channel-repository";
import { appRoutes } from "@/lib/site-config";

export default async function SettingsWhatsappChannelPage() {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  if (user.role !== "admin") {
    redirect(appRoutes.settings);
  }

  const config = await syncChannelConnectionStatus();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Channel WhatsApp
        </h1>
        <p className="text-muted-foreground text-sm">
          Kelola nomor channel global untuk semua user.
        </p>
      </div>
      <WhatsAppChannelCard initialConfig={config} />
    </div>
  );
}
