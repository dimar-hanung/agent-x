export const siteConfig = {
  name: "AgentX",
  description: "AgentX — intelligent agent platform",
} as const;

export const appRoutes = {
  dashboard: "/dashboard",
  chat: "/chat",
  settings: "/dashboard/settings",
  settingsModel: "/dashboard/settings/model",
  settingsWhatsappChannel: "/dashboard/settings/whatsapp-channel",
  profile: "/dashboard/profile",
  users: "/dashboard/users",
  todos: "/dashboard/todos",
  memories: "/dashboard/memories",
  schedules: "/dashboard/schedules",
  files: "/dashboard/files",
  filesFileChat: (fileId: string) => `/dashboard/files/${fileId}`,
  whatsappInbox: "/dashboard/whatsapp-inbox",
} as const;
