import type { ToolKey } from "./tool-keys";

export type { McpServerKey, McpToolDefinition, McpToolKey, NativeToolKey, ToolKey } from "./tool-keys";
export { isMcpToolKey, isNativeToolKey } from "./tool-keys";

export interface ToolResult {
  success: boolean;
  code?: string;
  message?: string;
  data?: unknown;
}

export interface GetTimeToolResult extends ToolResult {
  data?: { iso: string; timezone: string; local: string };
}

export interface EchoToolResult extends ToolResult {
  data?: { echo: string; greetedAs: string };
}

export interface RoleInfoToolResult extends ToolResult {
  data?: {
    user: {
      userId: string;
      email: string;
      role: string;
      displayName: string;
    };
    availableTools: ToolKey[];
    native: ToolKey[];
    mcp: ToolKey[];
  };
}

export interface ExaWebSearchToolResult extends ToolResult {
  data?: {
    query: string;
    sources: Array<{
      title: string;
      url: string;
      snippet: string;
      publishedDate?: string;
    }>;
  };
}

export interface ExaWebFetchToolResult extends ToolResult {
  data?: {
    pages: Array<{
      url: string;
      title?: string;
      text: string;
    }>;
  };
}

export interface CreateScheduleToolResult extends ToolResult {
  data?: {
    jobId: string;
    title: string;
    scheduleKind: "cron" | "once";
    nextRunAt: string | null;
    nextRunAtLabel: string | null;
  };
}

export interface ListSchedulesToolResult extends ToolResult {
  data?: {
    schedules: Array<{
      id: string;
      title: string;
      scheduleKind: "cron" | "once";
      status: string;
      nextRunAt: string | null;
      nextRunAtLabel: string | null;
      runCount: number;
    }>;
  };
}

export interface CancelScheduleToolResult extends ToolResult {
  data?: { jobId: string };
}

export interface SendEmailToolResult extends ToolResult {
  data?: { messageId: string; to: string; sentBy: string };
}

export interface SearchInboxToolResult extends ToolResult {
  data?: {
    messages: Array<{
      uid: number;
      from: string;
      subject: string;
      date: string;
      snippet: string;
    }>;
  };
}

export interface ReadEmailToolResult extends ToolResult {
  data?: {
    uid: number;
    from: string;
    to: string;
    subject: string;
    date: string;
    textBody: string;
    htmlBody?: string;
  };
}

export interface AgentStep {
  action: string;
  timestamp: Date;
}
