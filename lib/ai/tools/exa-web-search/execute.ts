import { executeWebSearch } from "@/lib/ai/web-search/execute";

import type { ExaWebSearchInput } from "./schema";
import type { ExaWebSearchToolResult } from "./types";

export async function executeExaWebSearch(
  input: ExaWebSearchInput
): Promise<ExaWebSearchToolResult> {
  return executeWebSearch(input);
}
