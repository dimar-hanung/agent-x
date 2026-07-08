import { tool } from "ai";

import { executeGetTime } from "./execute";
import { getTimeInputSchema } from "./schema";

export function createGetTimeTool() {
  return tool({
    description:
      "Get the current date and time, optionally in a specific IANA timezone.",
    inputSchema: getTimeInputSchema,
    execute: executeGetTime,
  });
}
