import { redirect } from "next/navigation";

import { PanduanWorkspace } from "@/components/dashboard/panduan/panduan-workspace";
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
import { getSessionUser } from "@/lib/auth/get-session-user";
import { onboardingSteps } from "@/lib/onboarding/steps";

export default async function PanduanPage() {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  if (user.role !== "client") {
    redirect("/dashboard");
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
                <BreadcrumbPage>Panduan</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col p-4 pt-0 pb-6">
        <PanduanWorkspace
          steps={onboardingSteps}
          displayName={user.displayName}
          isCompleted={user.onboardingCompletedAt !== null}
        />
      </div>
    </>
  );
}
