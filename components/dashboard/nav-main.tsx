"use client"

import Link from "next/link"
import { type LucideIcon } from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { appRoutes } from "@/lib/site-config"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    isActive?: boolean
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isChat = item.url === appRoutes.chat
          const content = (
            <>
              <item.icon />
              <span>{item.title}</span>
            </>
          )

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                size="lg"
                tooltip={item.title}
                isActive={item.isActive}
                className="relative [&>svg]:size-5 before:absolute before:inset-y-1.5 before:left-0 before:w-1 before:rounded-r-full before:bg-primary before:opacity-0 before:transition-opacity data-[active=true]:before:opacity-100"
              >
                {isChat ? (
                  <a href={item.url}>{content}</a>
                ) : (
                  <Link href={item.url}>{content}</Link>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
