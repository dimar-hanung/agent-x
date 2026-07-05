import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { WhatsAppChannelCard } from "@/components/settings/whatsapp-channel-card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { syncChannelConnectionStatus } from "@/lib/integrations/whatsapp-channel-repository";

export default async function WhatsAppChannelPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login?next=/dashboard/whatsapp-channel");
  }

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const config = await syncChannelConnectionStatus();

  return (
    <SidebarProvider>
      <AppSidebar
        role={user.role}
        user={{
          name: user.displayName,
          email: user.email,
          avatar: "",
        }}
      />
      <SidebarInset>
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
                  <BreadcrumbPage>Channel WhatsApp</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Channel WhatsApp
            </h1>
            <p className="text-muted-foreground text-sm">
              Kelola nomor channel global untuk semua user.
            </p>
          </div>
          <div className="max-w-xl">
            <WhatsAppChannelCard initialConfig={config} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
