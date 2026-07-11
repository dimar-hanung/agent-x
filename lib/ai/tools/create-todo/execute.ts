import type { UserContext } from "@/lib/ai/roles/types";
import { createTodo } from "@/lib/todos/repository";
import { createTodoSchema } from "@/lib/todos/schemas";

import type { CreateTodoToolInput } from "./schema";
import type { CreateTodoToolResult } from "./types";

export async function executeCreateTodo(
  input: CreateTodoToolInput,
  ctx: { user: UserContext }
): Promise<CreateTodoToolResult> {
  try {
    const parsed = createTodoSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
      };
    }

    const todo = await createTodo(ctx.user.userId, parsed.data);

    return {
      success: true,
      data: { todo },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal membuat todo.",
    };
  }
}
