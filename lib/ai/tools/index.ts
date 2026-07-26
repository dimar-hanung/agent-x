// See docs/adding-ai-tools.md to add a new tool.

import type { Tool } from "ai";

import type { ChatAgentRuntimeContext } from "@/lib/ai/agents/chat-agent";
import type { UserContext } from "@/lib/ai/roles/types";

import type { NativeToolKey } from "./tool-keys";
import { createCancelScheduleTool } from "./cancel-schedule/cancel-schedule.tool";
import { createCreateCalendarEventTool } from "./create-calendar-event/create-calendar-event.tool";
import { createCreateMicrosoftCalendarEventTool } from "./create-microsoft-calendar-event/create-microsoft-calendar-event.tool";
import { createCreateScheduleTool } from "./create-schedule/create-schedule.tool";
import { createCreateTodoTool } from "./create-todo/create-todo.tool";
import { createDeleteTodoTool } from "./delete-todo/delete-todo.tool";
import { createExaWebFetchTool } from "./exa-web-fetch/exa-web-fetch.tool";
import { createExaWebSearchTool } from "./exa-web-search/exa-web-search.tool";
import { createFetchThreadsDataTool } from "./fetch-threads-data/fetch-threads-data.tool";
import { createFetchTikTokDataTool } from "./fetch-tiktok-data/fetch-tiktok-data.tool";
import { createFetchTwitterDataTool } from "./fetch-twitter-data/fetch-twitter-data.tool";
import { createForgetMemoryTool } from "./forget-memory/forget-memory.tool";
import { createGetTimeTool } from "./get-time/get-time.tool";
import { createGetTodoTool } from "./get-todo/get-todo.tool";
import { createListCalendarEventsTool } from "./list-calendar-events/list-calendar-events.tool";
import { createListMicrosoftCalendarEventsTool } from "./list-microsoft-calendar-events/list-microsoft-calendar-events.tool";
import { createListFilesTool } from "./list-files/list-files.tool";
import { createListMemoriesTool } from "./list-memories/list-memories.tool";
import { createListSchedulesTool } from "./list-schedules/list-schedules.tool";
import { createListTodosTool } from "./list-todos/list-todos.tool";
import { createListWhatsappChatsTool } from "./list-whatsapp-chats/list-whatsapp-chats.tool";
import { createReadDriveFileTool } from "./read-drive-file/read-drive-file.tool";
import { createReadEmailTool } from "./read-email/read-email.tool";
import { createReadMicrosoftEmailTool } from "./read-microsoft-email/read-microsoft-email.tool";
import { createReadOnedriveFileTool } from "./read-onedrive-file/read-onedrive-file.tool";
import { createReadFileTool } from "./read-file/read-file.tool";
import { createRememberMemoryTool } from "./remember-memory/remember-memory.tool";
import { createSearchDriveTool } from "./search-drive/search-drive.tool";
import { createSearchInboxTool } from "./search-inbox/search-inbox.tool";
import { createSearchMicrosoftInboxTool } from "./search-microsoft-inbox/search-microsoft-inbox.tool";
import { createSearchOnedriveTool } from "./search-onedrive/search-onedrive.tool";
import { createSendEmailTool } from "./send-email/send-email.tool";
import { createSendMicrosoftEmailTool } from "./send-microsoft-email/send-microsoft-email.tool";
import { createSummarizeWhatsappChatTool } from "./summarize-whatsapp-chat/summarize-whatsapp-chat.tool";
import { createSummarizeWhatsappDigestTool } from "./summarize-whatsapp-digest/summarize-whatsapp-digest.tool";
import { createUpdateTodoTool } from "./update-todo/update-todo.tool";
import { createUploadDriveFileTool } from "./upload-drive-file/upload-drive-file.tool";
import { createUploadOnedriveFileTool } from "./upload-onedrive-file/upload-onedrive-file.tool";
import { createUploadFileTool } from "./upload-file/upload-file.tool";

function createToolRegistry(
  user: UserContext,
  runtimeContext?: ChatAgentRuntimeContext
): Record<NativeToolKey, Tool> {
  return {
    get_time: createGetTimeTool(),
    exa_web_search: createExaWebSearchTool(),
    exa_web_fetch: createExaWebFetchTool(),
    fetch_tiktok_data: createFetchTikTokDataTool(user, runtimeContext),
    fetch_twitter_data: createFetchTwitterDataTool(user, runtimeContext),
    fetch_threads_data: createFetchThreadsDataTool(user, runtimeContext),
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
    send_microsoft_email: createSendMicrosoftEmailTool(user),
    search_microsoft_inbox: createSearchMicrosoftInboxTool(user),
    read_microsoft_email: createReadMicrosoftEmailTool(user),
    list_microsoft_calendar_events: createListMicrosoftCalendarEventsTool(user),
    create_microsoft_calendar_event: createCreateMicrosoftCalendarEventTool(user),
    search_onedrive: createSearchOnedriveTool(user),
    read_onedrive_file: createReadOnedriveFileTool(user),
    upload_onedrive_file: createUploadOnedriveFileTool(user),
    list_todos: createListTodosTool(user),
    get_todo: createGetTodoTool(user),
    create_todo: createCreateTodoTool(user),
    update_todo: createUpdateTodoTool(user),
    delete_todo: createDeleteTodoTool(user),
    remember_memory: createRememberMemoryTool(user),
    forget_memory: createForgetMemoryTool(user),
    list_memories: createListMemoriesTool(user),
    list_files: createListFilesTool(user),
    upload_file: createUploadFileTool(user),
    read_file: createReadFileTool(user),
    list_whatsapp_chats: createListWhatsappChatsTool(user),
    summarize_whatsapp_chat: createSummarizeWhatsappChatTool(user),
    summarize_whatsapp_digest: createSummarizeWhatsappDigestTool(user),
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
