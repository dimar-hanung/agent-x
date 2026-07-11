import type { UserContext } from "@/lib/ai/roles/types";
import { listTodosByUserId } from "@/lib/todos/repository";

import type { ListTodosInput } from "./schema";
import type { ListTodosToolResult } from "./types";

export async function executeListTodos(
  input: ListTodosInput,
  ctx: { user: UserContext }
): Promise<ListTodosToolResult> {
  try {
    const todos = await listTodosByUserId(ctx.user.userId, {
      status: input.status,
      project: input.project,
    });

    return {
      success: true,
      data: { todos },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Gagal memuat daftar todo.",
    };
  }
}
