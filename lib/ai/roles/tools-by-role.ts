import {
  isExaToolKey,
  isMcpToolKey,
  isNativeToolKey,
  type McpToolKey,
  type NativeToolKey,
  type ToolKey,
} from "@/lib/ai/tools/tool-keys";

import type { AppRole } from "./types";

const CLIENT_ADMIN_TOOLS: ToolKey[] = [
  "get_time",
  "echo",
  "role_info",
  "exa_web_search",
  "exa_web_fetch",
  "fetch_tiktok_data",
  "fetch_twitter_data",
  "fetch_threads_data",
  "create_schedule",
  "list_schedules",
  "cancel_schedule",
  "send_email",
  "search_inbox",
  "read_email",
  "list_calendar_events",
  "create_calendar_event",
  "search_drive",
  "read_drive_file",
  "upload_drive_file",
  "list_todos",
  "get_todo",
  "create_todo",
  "update_todo",
  "delete_todo",
];

const TOOLS_BY_ROLE: Record<AppRole, ToolKey[]> = {
  guest: ["get_time"],
  client: [
    "get_time",
    "echo",
    "role_info",
    "exa_web_search",
    "exa_web_fetch",
    "create_schedule",
    "list_schedules",
    "cancel_schedule",
    "send_email",
    "search_inbox",
    "read_email",
  ],
  admin: [
    "get_time",
    "echo",
    "role_info",
    "exa_web_search",
    "exa_web_fetch",
    "create_schedule",
    "list_schedules",
    "cancel_schedule",
    "send_email",
    "search_inbox",
    "read_email",
  ],
};

export function getToolKeysForRole(role: AppRole): ToolKey[] {
  return TOOLS_BY_ROLE[role];
}

export function getNativeToolKeysForRole(role: AppRole): NativeToolKey[] {
  return getToolKeysForRole(role).filter(isNativeToolKey);
}

export function getMcpToolKeysForRole(role: AppRole): McpToolKey[] {
  return getToolKeysForRole(role).filter(isMcpToolKey);
}

export function userHasExaTools(role: AppRole): boolean {
  return getToolKeysForRole(role).some(isExaToolKey);
}
