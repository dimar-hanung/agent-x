import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardOverviewView } from "@/components/dashboard/overview/dashboard-overview";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { getDashboardOverview } from "@/lib/dashboard/get-overview";

export default async function Page() {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  const overview = await getDashboardOverview(user.userId, user.displayName);

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
              <BreadcrumbItem>
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <DashboardOverviewView data={overview} />
    </>
  );
}
