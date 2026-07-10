import type { UserContext } from "@/lib/ai/roles/types";
import { createMemory } from "@/lib/memory/repository";
import { createMemorySchema } from "@/lib/memory/schemas";

import type { RememberMemoryInput } from "./schema";
import type { RememberMemoryToolResult } from "./types";

export async function executeRememberMemory(
  input: RememberMemoryInput,
  ctx: { user: UserContext }
): Promise<RememberMemoryToolResult> {
  try {
    const parsed = createMemorySchema.safeParse({
      content: input.content,
      source: "tool",
    });

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
      };
    }

    const memory = await createMemory(ctx.user.userId, {
      content: parsed.data.content,
      source: "tool",
    });

    return {
      success: true,
      data: { memory },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Gagal menyimpan memory.",
    };
  }
}
