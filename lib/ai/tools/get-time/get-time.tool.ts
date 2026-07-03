import { tool } from "ai";
import { z } from "zod";

import type { GetTimeToolResult } from "../ai-tools.types";

export function createGetTimeTool() {
  return tool({
    description: "Get the current date and time, optionally in a specific IANA timezone.",
    inputSchema: z.object({
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone, e.g. "Asia/Jakarta". Defaults to UTC.'),
    }),
    execute: async ({ timezone }): Promise<GetTimeToolResult> => {
      const tz = timezone ?? "UTC";

      try {
        const iso = new Date().toLocaleString("en-US", {
          timeZone: tz,
          hour12: false,
        });

        return {
          success: true,
          data: { iso: new Date().toISOString(), timezone: tz, local: iso },
        };
      } catch {
        return {
          success: false,
          message: `Invalid timezone: ${tz}`,
        };
      }
    },
  });
}
