"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { getSettingsCategoriesForRole } from "@/lib/settings/nav";

interface SettingsCategoryNavProps {
  role: string | undefined;
}

function isCategoryActive(pathname: string, href: string) {
  if (href === "/dashboard/settings") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SettingsCategoryNav({ role }: SettingsCategoryNavProps) {
  const pathname = usePathname();
  const categories = getSettingsCategoriesForRole(role);

  return (
    <>
      <nav
        aria-label="Kategori pengaturan"
        className="hidden w-[260px] shrink-0 border-r md:block"
      >
        <div className="sticky top-0 space-y-1 p-3">
          {categories.map((category) => {
            const active = isCategoryActive(pathname, category.href);
            const Icon = category.icon;

            return (
              <Link
                key={category.id}
                href={category.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-4 shrink-0" />
                <span>{category.title}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <nav
        aria-label="Kategori pengaturan"
        className="border-b md:hidden"
      >
        <div className="flex gap-1 overflow-x-auto p-2">
          {categories.map((category) => {
            const active = isCategoryActive(pathname, category.href);
            const Icon = category.icon;

            return (
              <Link
                key={category.id}
                href={category.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="size-4 shrink-0" />
                <span>{category.title}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
