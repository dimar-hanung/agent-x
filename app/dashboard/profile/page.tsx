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
import { ProfileDetails } from "@/components/dashboard/profile/profile-details";
import { getSessionUser } from "@/lib/auth/get-session-user";

export default async function ProfilePage() {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

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
                <BreadcrumbPage>Profil</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="max-w-3xl">
          <h1 className="text-xl font-semibold tracking-tight">Profil</h1>
          <p className="text-muted-foreground">
            Kelola data akun dan ubah password.
          </p>
        </div>
        <div className="max-w-3xl">
          <ProfileDetails
            displayName={user.displayName}
            email={user.email}
            role={user.role}
          />
        </div>
      </div>
    </>
  );
}
