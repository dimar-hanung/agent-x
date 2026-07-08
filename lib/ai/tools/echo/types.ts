import type { ToolResult } from "../ai-tools.types";

export interface EchoToolResult extends ToolResult {
  data?: { echo: string; greetedAs: string };
}
