"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import {
  Brain,
  CheckSquare,
  MessageSquare,
  Radio,
  Settings2,
  SquareTerminal,
  Users,
} from "lucide-react";

import { IndonesianFlagIcon } from "@/components/icons/indonesian-flag-icon";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { siteConfig, appRoutes } from "@/lib/site-config";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  role?: string;
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}

function isNavActive(pathname: string, url: string) {
  if (url === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === url || pathname.startsWith(`${url}/`);
}

export function AppSidebar({ role, user, ...props }: AppSidebarProps) {
  const pathname = usePathname();

  const adminNav =
    role === "admin"
      ? [
          {
            title: "Kelola User",
            url: appRoutes.users,
            icon: Users,
          },
          {
            title: "Channel WhatsApp",
            url: "/dashboard/whatsapp-channel",
            icon: Radio,
          },
        ]
      : [];

  const data = {
    user,
    navMain: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: SquareTerminal,
      },
      {
        title: "Chat",
        url: appRoutes.chat,
        icon: MessageSquare,
      },
      {
        title: "Todo",
        url: appRoutes.todos,
        icon: CheckSquare,
      },
      {
        title: "Memory",
        url: appRoutes.memories,
        icon: Brain,
      },
      ...adminNav,
      {
        title: "Integrations",
        url: appRoutes.settings,
        icon: Settings2,
      },
    ].map((item) => ({
      ...item,
      isActive: isNavActive(pathname, item.url),
    })),
  };

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="flex aspect-square size-10 shrink-0 items-center justify-center">
                  <IndonesianFlagIcon className="size-10" />
                </div>
                <div className="flex flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{siteConfig.name}</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
