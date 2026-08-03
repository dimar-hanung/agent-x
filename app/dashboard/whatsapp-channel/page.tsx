import { redirect } from "next/navigation";

import { appRoutes } from "@/lib/site-config";

export default function LegacyWhatsappChannelPage() {
  redirect(appRoutes.settingsWhatsappChannel);
}
