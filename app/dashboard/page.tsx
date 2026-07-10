import Link from "next/link";
import { Brain, CheckSquare, MessageSquare } from "lucide-react";

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
import { appRoutes, siteConfig } from "@/lib/site-config";

const quickLinks = [
  {
    title: "Chat",
    description: "Bicara dengan agent",
    href: appRoutes.chat,
    icon: MessageSquare,
  },
  {
    title: "Todo",
    description: "Kelola daftar tugas",
    href: appRoutes.todos,
    icon: CheckSquare,
  },
  {
    title: "Memory",
    description: "Lihat memori tersimpan",
    href: appRoutes.memories,
    icon: Brain,
  },
] as const;

export default function Page() {
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
                <BreadcrumbPage>Ringkasan</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Selamat datang di {siteConfig.name}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Pilih area kerja untuk mulai.
          </p>
        </div>
        <nav className="flex flex-col gap-3 sm:flex-row sm:gap-6">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-foreground text-muted-foreground flex items-start gap-3 transition-colors"
            >
              <item.icon className="mt-0.5 size-5 shrink-0" />
              <span>
                <span className="text-foreground block font-medium">
                  {item.title}
                </span>
                <span className="text-sm">{item.description}</span>
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
