import { redirect } from "next/navigation";

import { appRoutes } from "@/lib/site-config";

export default async function LegacyDashboardChatIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`${appRoutes.chat}/${id}`);
}
