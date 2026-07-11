import type { UserContext } from "@/lib/ai/roles/types";
import { getTodoByIdOrCode, updateTodo } from "@/lib/todos/repository";
import { updateTodoSchema } from "@/lib/todos/schemas";

import type { UpdateTodoToolInput } from "./schema";
import type { UpdateTodoToolResult } from "./types";

export async function executeUpdateTodo(
  input: UpdateTodoToolInput,
  ctx: { user: UserContext }
): Promise<UpdateTodoToolResult> {
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

    const { id: _id, code: _code, ...rest } = input;
    const parsed = updateTodoSchema.safeParse(rest);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
      };
    }

    const todo = await updateTodo(ctx.user.userId, existing.id, parsed.data);

    return {
      success: true,
      data: { todo },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Gagal memperbarui todo.",
    };
  }
}
