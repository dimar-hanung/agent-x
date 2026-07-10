import type { UserContext } from "@/lib/ai/roles/types";
import { listMemories } from "@/lib/memory/repository";

import type { ListMemoriesInput } from "./schema";
import type { ListMemoriesToolResult } from "./types";

export async function executeListMemories(
  _input: ListMemoriesInput,
  ctx: { user: UserContext }
): Promise<ListMemoriesToolResult> {
  try {
    const memories = await listMemories(ctx.user.userId);

    return {
      success: true,
      data: { memories },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal memuat daftar memory.",
    };
  }
}
