export type {
  McpServerKey,
  McpToolDefinition,
  McpToolKey,
  NativeToolKey,
  ToolKey,
} from "./tool-keys";
export { isMcpToolKey, isNativeToolKey } from "./tool-keys";

export interface ToolResult {
  success: boolean;
  code?: string;
  message?: string;
  data?: unknown;
}

export type { CancelScheduleToolResult } from "./cancel-schedule/types";
export type { CreateScheduleToolResult } from "./create-schedule/types";
export type { EchoToolResult } from "./echo/types";
export type { ExaWebFetchToolResult } from "./exa-web-fetch/types";
export type { ExaWebSearchToolResult } from "./exa-web-search/types";
export type { FetchThreadsDataToolResult } from "./fetch-threads-data/types";
export type { FetchTikTokDataToolResult } from "./fetch-tiktok-data/types";
export type { FetchTwitterDataToolResult } from "./fetch-twitter-data/types";
export type { GetTimeToolResult } from "./get-time/types";
export type { ListSchedulesToolResult } from "./list-schedules/types";
export type { ReadEmailToolResult } from "./read-email/types";
export type { RoleInfoToolResult } from "./role-info/types";
export type { SearchInboxToolResult } from "./search-inbox/types";
export type { SendEmailToolResult } from "./send-email/types";
