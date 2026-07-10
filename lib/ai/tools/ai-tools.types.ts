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
export type { CreateCalendarEventToolResult } from "./create-calendar-event/types";
export type { CreateScheduleToolResult } from "./create-schedule/types";
export type { CreateTodoToolResult } from "./create-todo/types";
export type { DeleteTodoToolResult } from "./delete-todo/types";
export type { ExaWebFetchToolResult } from "./exa-web-fetch/types";
export type { ExaWebSearchToolResult } from "./exa-web-search/types";
export type { ForgetMemoryToolResult } from "./forget-memory/types";
export type { GetTimeToolResult } from "./get-time/types";
export type { GetTodoToolResult } from "./get-todo/types";
export type { ListCalendarEventsToolResult } from "./list-calendar-events/types";
export type { ListMemoriesToolResult } from "./list-memories/types";
export type { ListSchedulesToolResult } from "./list-schedules/types";
export type { ListTodosToolResult } from "./list-todos/types";
export type { ReadDriveFileToolResult } from "./read-drive-file/types";
export type { ReadEmailToolResult } from "./read-email/types";
export type { RememberMemoryToolResult } from "./remember-memory/types";
export type { SearchDriveToolResult } from "./search-drive/types";
export type { SearchInboxToolResult } from "./search-inbox/types";
export type { SendEmailToolResult } from "./send-email/types";
export type { UpdateTodoToolResult } from "./update-todo/types";
export type { UploadDriveFileToolResult } from "./upload-drive-file/types";
