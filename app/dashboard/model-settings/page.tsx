import { redirect } from "next/navigation";

import { ModelSettingsCard } from "@/components/dashboard/model-settings-card";
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
import {
  getModelSettings,
  getModelSettingsOptions,
} from "@/lib/admin/model-settings/repository";
import { getSessionUser } from "@/lib/auth/get-session-user";

export default async function ModelSettingsPage() {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const [settings, options] = await Promise.all([
    getModelSettings(),
    Promise.resolve(getModelSettingsOptions()),
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
                <BreadcrumbPage>Pengaturan Model</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Pengaturan Model
          </h1>
          <p className="text-muted-foreground text-sm">
            Kelola model teks dan vision untuk seluruh jalur chat AgentX.
          </p>
        </div>
        <div className="max-w-xl">
          <ModelSettingsCard
            initialSettings={settings}
            initialOptions={options}
          />
        </div>
      </div>
    </>
  );
}
