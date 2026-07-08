"use client";

import * as React from "react";
import {
  LifeBuoy,
  MessageSquare,
  Radio,
  Send,
  Settings2,
  SquareTerminal,
  Users,
} from "lucide-react";

import { IndonesianFlagIcon } from "@/components/icons/indonesian-flag-icon";
import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
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

export function AppSidebar({ role, user, ...props }: AppSidebarProps) {
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
        isActive: true,
      },
      {
        title: "Chat",
        url: appRoutes.chat,
        icon: MessageSquare,
      },
      ...adminNav,
      {
        title: "Integrations",
        url: appRoutes.settings,
        icon: Settings2,
      },
    ],
    navSecondary: [
      {
        title: "Support",
        url: "#",
        icon: LifeBuoy,
      },
      {
        title: "Feedback",
        url: "#",
        icon: Send,
      },
    ],
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
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
