// See docs/adding-ai-tools.md to add a new tool.

import type { Tool } from "ai";

import type { ChatAgentRuntimeContext } from "@/lib/ai/agents/chat-agent";
import type { UserContext } from "@/lib/ai/roles/types";

import type { NativeToolKey } from "./tool-keys";
import { createCancelScheduleTool } from "./cancel-schedule/cancel-schedule.tool";
import { createCreateCalendarEventTool } from "./create-calendar-event/create-calendar-event.tool";
import { createCreateScheduleTool } from "./create-schedule/create-schedule.tool";
import { createEchoTool } from "./echo/echo.tool";
import { createExaWebFetchTool } from "./exa-web-fetch/exa-web-fetch.tool";
import { createExaWebSearchTool } from "./exa-web-search/exa-web-search.tool";
import { createGetTimeTool } from "./get-time/get-time.tool";
import { createListCalendarEventsTool } from "./list-calendar-events/list-calendar-events.tool";
import { createListSchedulesTool } from "./list-schedules/list-schedules.tool";
import { createReadDriveFileTool } from "./read-drive-file/read-drive-file.tool";
import { createReadEmailTool } from "./read-email/read-email.tool";
import { createRoleInfoTool } from "./role-info/role-info.tool";
import { createSearchDriveTool } from "./search-drive/search-drive.tool";
import { createSearchInboxTool } from "./search-inbox/search-inbox.tool";
import { createSendEmailTool } from "./send-email/send-email.tool";
import { createUploadDriveFileTool } from "./upload-drive-file/upload-drive-file.tool";

function createToolRegistry(
  user: UserContext,
  runtimeContext?: ChatAgentRuntimeContext
): Record<NativeToolKey, Tool> {
  return {
    get_time: createGetTimeTool(),
    echo: createEchoTool(user),
    role_info: createRoleInfoTool(user),
    exa_web_search: createExaWebSearchTool(),
    exa_web_fetch: createExaWebFetchTool(),
    create_schedule: createCreateScheduleTool(user, runtimeContext),
    list_schedules: createListSchedulesTool(user),
    cancel_schedule: createCancelScheduleTool(user),
    send_email: createSendEmailTool(user),
    search_inbox: createSearchInboxTool(user),
    read_email: createReadEmailTool(user),
    list_calendar_events: createListCalendarEventsTool(user),
    create_calendar_event: createCreateCalendarEventTool(user),
    search_drive: createSearchDriveTool(user),
    read_drive_file: createReadDriveFileTool(user),
    upload_drive_file: createUploadDriveFileTool(user),
  };
}

export function createToolsForUser(
  user: UserContext,
  keys: NativeToolKey[],
  runtimeContext?: ChatAgentRuntimeContext
): Partial<Record<NativeToolKey, Tool>> {
  const registry = createToolRegistry(user, runtimeContext);
  const tools: Partial<Record<NativeToolKey, Tool>> = {};

  for (const key of keys) {
    tools[key] = registry[key];
  }

  return tools;
}
