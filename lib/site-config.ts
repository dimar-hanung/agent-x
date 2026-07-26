export const siteConfig = {
  name: "AgentX",
  description: "AgentX — intelligent agent platform",
} as const;

export const appRoutes = {
  dashboard: "/dashboard",
  chat: "/chat",
  settings: "/dashboard/settings",
  users: "/dashboard/users",
  todos: "/dashboard/todos",
  memories: "/dashboard/memories",
  schedules: "/dashboard/schedules",
  files: "/dashboard/files",
  whatsappInbox: "/dashboard/whatsapp-inbox",
} as const;
