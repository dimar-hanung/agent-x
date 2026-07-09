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
];

const TOOLS_BY_ROLE: Record<AppRole, ToolKey[]> = {
  guest: ["get_time"],
  client: CLIENT_ADMIN_TOOLS,
  admin: CLIENT_ADMIN_TOOLS,
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
