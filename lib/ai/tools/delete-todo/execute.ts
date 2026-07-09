import type { UserContext } from "@/lib/ai/roles/types";
import { deleteTodo, getTodoByIdOrCode } from "@/lib/todos/repository";

import type { DeleteTodoInput } from "./schema";
import type { DeleteTodoToolResult } from "./types";

export async function executeDeleteTodo(
  input: DeleteTodoInput,
  ctx: { user: UserContext }
): Promise<DeleteTodoToolResult> {
  try {
    if (!input.id && !input.code) {
      return {
        success: false,
        message: "Isi id atau code todo.",
      };
    }

    const existing = await getTodoByIdOrCode(ctx.user.userId, {
      id: input.id,
      code: input.code,
    });

    if (!existing) {
      return {
        success: false,
        message: "Todo tidak ditemukan.",
      };
    }

    await deleteTodo(ctx.user.userId, existing.id);

    return {
      success: true,
      data: {
        id: existing.id,
        code: existing.code,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal menghapus todo.",
    };
  }
}
