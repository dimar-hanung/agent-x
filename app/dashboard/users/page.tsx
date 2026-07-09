import { redirect } from "next/navigation";

import { UsersTable } from "@/components/dashboard/users/users-table";
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
import { listUsers } from "@/lib/admin/users/repository";
import { getSessionUser } from "@/lib/auth/get-session-user";

export default async function UsersPage() {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const users = await listUsers();

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
                <BreadcrumbPage>Kelola User</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Kelola User
          </h1>
          <p className="text-muted-foreground text-sm">
            Buat, ubah, dan hapus akun client atau guest. Kredensial login
            dikirim via WhatsApp saat pembuatan user.
          </p>
        </div>
        <UsersTable initialUsers={users} />
      </div>
    </>
  );
}
