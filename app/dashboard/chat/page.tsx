import { redirect } from "next/navigation";

import { appRoutes } from "@/lib/site-config";

export default async function LegacyDashboardChatPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const { new: draftKey } = await searchParams;

  if (draftKey) {
    redirect(`${appRoutes.chat}?new=${draftKey}`);
  }

  redirect(appRoutes.chat);
}
