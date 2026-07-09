import type { GetTimeInput } from "./schema";
import type { GetTimeToolResult } from "./types";

export async function executeGetTime(
  input: GetTimeInput
): Promise<GetTimeToolResult> {
  const tz = input.timezone ?? "UTC";

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
}
