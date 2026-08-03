import { redirect } from "next/navigation";

import { ModelSettingsCard } from "@/components/dashboard/model-settings-card";
import {
  getModelSettings,
  getModelSettingsOptions,
} from "@/lib/admin/model-settings/repository";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { appRoutes } from "@/lib/site-config";

export default async function SettingsModelPage() {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  if (user.role !== "admin") {
    redirect(appRoutes.settings);
  }

  const [settings, options] = await Promise.all([
    getModelSettings(),
    Promise.resolve(getModelSettingsOptions()),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Model</h1>
        <p className="text-muted-foreground mt-1">
          Kelola model teks, vision, dan voice untuk seluruh jalur chat AgentX.
        </p>
      </div>
      <ModelSettingsCard initialSettings={settings} initialOptions={options} />
    </div>
  );
}
