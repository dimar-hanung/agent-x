import type { UserContext } from "@/lib/ai/roles/types";
import { getTodoByIdOrCode } from "@/lib/todos/repository";

import type { GetTodoInput } from "./schema";
import type { GetTodoToolResult } from "./types";

export async function executeGetTodo(
  input: GetTodoInput,
  ctx: { user: UserContext }
): Promise<GetTodoToolResult> {
  try {
    if (!input.id && !input.code) {
      return {
        success: false,
        message: "Isi id atau code todo.",
      };
    }

    const todo = await getTodoByIdOrCode(ctx.user.userId, {
      id: input.id,
      code: input.code,
    });

    if (!todo) {
      return {
        success: false,
        message: "Todo tidak ditemukan.",
      };
    }

    return {
      success: true,
      data: { todo },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal memuat todo.",
    };
  }
}
