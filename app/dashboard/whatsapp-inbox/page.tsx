import Link from "next/link";

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
import { InboxWorkspace } from "@/components/dashboard/whatsapp-inbox/inbox-workspace";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { listDigestSnapshots } from "@/lib/integrations/whatsapp-inbox/summary/service";
import { syncUserConnectionStatus } from "@/lib/integrations/whatsapp-inbox/user-instance-repository";

export default async function WhatsAppInboxPage() {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  const [instance, snapshots] = await Promise.all([
    syncUserConnectionStatus(user.userId),
    listDigestSnapshots(user.userId, 20),
  ]);

  const initialSnapshots = snapshots.map((snapshot) => ({
    id: snapshot.id,
    digestText: snapshot.digestText,
    chatCount: snapshot.chatCount,
    chunkCount: snapshot.chunkCount,
    coversFrom: snapshot.coversFrom.toISOString(),
    coversTo: snapshot.coversTo.toISOString(),
    generatedAt: snapshot.generatedAt.toISOString(),
  }));

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
                <BreadcrumbPage>Ringkasan WhatsApp</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex h-[calc(100svh-5rem)] flex-col gap-4 overflow-hidden p-4 pt-0">
        <div className="shrink-0">
          <h1 className="text-xl font-semibold tracking-tight">
            Ringkasan WhatsApp
          </h1>
          <p className="text-muted-foreground text-sm">
            Satu ringkasan lintas chat tersimpan sebagai snapshot.
          </p>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <InboxWorkspace
            initialInstance={instance}
            initialSnapshots={initialSnapshots}
          />
          {instance.status !== "connected" ? (
            <p className="text-muted-foreground mt-4 shrink-0 text-sm">
              Belum terhubung?{" "}
              <Link
                href="/dashboard/settings"
                className="text-primary underline"
              >
                Hubungkan di Settings
              </Link>
              .
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}
