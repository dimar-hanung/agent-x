import { executeWebFetch } from "@/lib/ai/web-search/execute";

import type { ExaWebFetchInput } from "./schema";
import type { ExaWebFetchToolResult } from "./types";

export async function executeExaWebFetch(
  input: ExaWebFetchInput
): Promise<ExaWebFetchToolResult> {
  return executeWebFetch(input);
}
