import type { LucideIcon } from "lucide-react";
import { Cpu, Plug, Radio } from "lucide-react";

import { appRoutes } from "@/lib/site-config";

export type SettingsCategoryId = "integrasi" | "model" | "whatsapp-channel";

export interface SettingsCategory {
  id: SettingsCategoryId;
  title: string;
  href: string;
  icon: LucideIcon;
  adminOnly: boolean;
}

export const settingsCategories: SettingsCategory[] = [
  {
    id: "integrasi",
    title: "Integrasi",
    href: appRoutes.settings,
    icon: Plug,
    adminOnly: false,
  },
  {
    id: "model",
    title: "Model",
    href: appRoutes.settingsModel,
    icon: Cpu,
    adminOnly: true,
  },
  {
    id: "whatsapp-channel",
    title: "Channel WhatsApp",
    href: appRoutes.settingsWhatsappChannel,
    icon: Radio,
    adminOnly: true,
  },
];

export function getSettingsCategoriesForRole(
  role: string | undefined
): SettingsCategory[] {
  return settingsCategories.filter(
    (category) => role === "admin" || !category.adminOnly
  );
}

export function getSettingsCategoryByHref(
  href: string
): SettingsCategory | undefined {
  return settingsCategories.find((category) => category.href === href);
}

export function isAdminOnlySettingsPath(pathname: string): boolean {
  const category = settingsCategories.find(
    (item) =>
      pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  return category?.adminOnly ?? false;
}
