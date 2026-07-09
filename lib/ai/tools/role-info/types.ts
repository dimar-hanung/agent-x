import type { ToolKey } from "../tool-keys";
import type { ToolResult } from "../ai-tools.types";

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
