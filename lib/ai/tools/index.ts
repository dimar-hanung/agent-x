// See docs/adding-ai-tools.md to add a new tool.

import type { Tool } from "ai";

import type { ChatAgentRuntimeContext } from "@/lib/ai/agents/chat-agent";
import type { UserContext } from "@/lib/ai/roles/types";

import type { NativeToolKey } from "./tool-keys";
import { createCancelScheduleTool } from "./cancel-schedule/cancel-schedule.tool";
import { createCreateScheduleTool } from "./create-schedule/create-schedule.tool";
import { createEchoTool } from "./echo/echo.tool";
import { createExaWebFetchTool } from "./exa-web-fetch/exa-web-fetch.tool";
import { createExaWebSearchTool } from "./exa-web-search/exa-web-search.tool";
import { createFetchThreadsDataTool } from "./fetch-threads-data/fetch-threads-data.tool";
import { createFetchTikTokDataTool } from "./fetch-tiktok-data/fetch-tiktok-data.tool";
import { createFetchTwitterDataTool } from "./fetch-twitter-data/fetch-twitter-data.tool";
import { createGetTimeTool } from "./get-time/get-time.tool";
import { createListSchedulesTool } from "./list-schedules/list-schedules.tool";
import { createReadEmailTool } from "./read-email/read-email.tool";
import { createRoleInfoTool } from "./role-info/role-info.tool";
import { createSearchInboxTool } from "./search-inbox/search-inbox.tool";
import { createSendEmailTool } from "./send-email/send-email.tool";

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
    fetch_tiktok_data: createFetchTikTokDataTool(user, runtimeContext),
    fetch_twitter_data: createFetchTwitterDataTool(user, runtimeContext),
    fetch_threads_data: createFetchThreadsDataTool(user, runtimeContext),
    create_schedule: createCreateScheduleTool(user, runtimeContext),
    list_schedules: createListSchedulesTool(user),
    cancel_schedule: createCancelScheduleTool(user),
    send_email: createSendEmailTool(user),
    search_inbox: createSearchInboxTool(user),
    read_email: createReadEmailTool(user),
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
