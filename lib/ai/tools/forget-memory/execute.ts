import type { UserContext } from "@/lib/ai/roles/types";
import { deleteMemory } from "@/lib/memory/repository";

import type { ForgetMemoryInput } from "./schema";
import type { ForgetMemoryToolResult } from "./types";

export async function executeForgetMemory(
  input: ForgetMemoryInput,
  ctx: { user: UserContext }
): Promise<ForgetMemoryToolResult> {
  try {
    await deleteMemory(ctx.user.userId, input.id);

    return {
      success: true,
      data: { id: input.id },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Gagal menghapus memory.",
    };
  }
}
