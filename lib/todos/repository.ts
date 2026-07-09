import { and, asc, desc, eq, max } from "drizzle-orm";

import { db } from "@/lib/db";
import { TODO_CODE_PREFIX, todos, type TodoStatus } from "@/lib/db/schema";

import type {
  CreateTodoInput,
  TodoListItem,
  UpdateTodoInput,
} from "./schemas";

function toListItem(row: {
  id: string;
  code: string;
  title: string;
  description: string | null;
  project: string | null;
  status: string;
  tags: string[] | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}): TodoListItem {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    project: row.project,
    status: row.status as TodoStatus,
    tags: row.tags ?? [],
    position: row.position,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const todoSelect = {
  id: todos.id,
  code: todos.code,
  title: todos.title,
  description: todos.description,
  project: todos.project,
  status: todos.status,
  tags: todos.tags,
  position: todos.position,
  createdAt: todos.createdAt,
  updatedAt: todos.updatedAt,
} as const;

export interface ListTodosFilters {
  status?: TodoStatus;
  project?: string;
}

export async function listTodosByUserId(
  userId: string,
  filters?: ListTodosFilters
): Promise<TodoListItem[]> {
  const conditions = [eq(todos.userId, userId)];

  if (filters?.status) {
    conditions.push(eq(todos.status, filters.status));
  }

  if (filters?.project !== undefined) {
    conditions.push(eq(todos.project, filters.project));
  }

  const rows = await db
    .select(todoSelect)
    .from(todos)
    .where(and(...conditions))
    .orderBy(asc(todos.status), asc(todos.position), desc(todos.createdAt));

  return rows.map(toListItem);
}

export async function getTodoByIdOrCode(
  userId: string,
  params: { id?: string; code?: string }
): Promise<TodoListItem | null> {
  if (!params.id && !params.code) {
    return null;
  }

  const conditions = [eq(todos.userId, userId)];

  if (params.id) {
    conditions.push(eq(todos.id, params.id));
  } else if (params.code) {
    conditions.push(eq(todos.code, params.code));
  }

  const [row] = await db
    .select(todoSelect)
    .from(todos)
    .where(and(...conditions))
    .limit(1);

  return row ? toListItem(row) : null;
}

async function nextPositionForStatus(
  userId: string,
  status: TodoStatus
): Promise<number> {
  const [row] = await db
    .select({ maxPosition: max(todos.position) })
    .from(todos)
    .where(and(eq(todos.userId, userId), eq(todos.status, status)));

  return (row?.maxPosition ?? -1) + 1;
}

async function allocateTodoCode(userId: string): Promise<string> {
  const rows = await db
    .select({ code: todos.code })
    .from(todos)
    .where(eq(todos.userId, userId));

  const pattern = new RegExp(`^${TODO_CODE_PREFIX}-(\\d+)$`);
  let maxNumber = 0;

  for (const row of rows) {
    const match = row.code.match(pattern);
    if (!match) continue;
    maxNumber = Math.max(maxNumber, Number(match[1]));
  }

  return `${TODO_CODE_PREFIX}-${maxNumber + 1}`;
}

export async function createTodo(
  userId: string,
  input: CreateTodoInput
): Promise<TodoListItem> {
  const status = (input.status ?? "todo") as TodoStatus;
  const position = await nextPositionForStatus(userId, status);
  const description =
    input.description === undefined || input.description === ""
      ? null
      : input.description;
  const project = input.project ?? null;

  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = await allocateTodoCode(userId);

    try {
      const [row] = await db
        .insert(todos)
        .values({
          userId,
          code,
          title: input.title,
          description,
          project,
          status,
          tags: input.tags ?? [],
          position,
          updatedAt: new Date(),
        })
        .returning(todoSelect);

      return toListItem(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const isUniqueViolation =
        message.includes("todos_user_id_code_idx") ||
        message.includes("unique") ||
        message.includes("duplicate");

      if (!isUniqueViolation || attempt === maxAttempts - 1) {
        throw error;
      }
    }
  }

  throw new Error("Gagal membuat kode todo.");
}

export async function updateTodo(
  userId: string,
  todoId: string,
  input: UpdateTodoInput
): Promise<TodoListItem> {
  const [existing] = await db
    .select({
      id: todos.id,
      status: todos.status,
      position: todos.position,
    })
    .from(todos)
    .where(and(eq(todos.id, todoId), eq(todos.userId, userId)))
    .limit(1);

  if (!existing) {
    throw new Error("Todo tidak ditemukan.");
  }

  const nextStatus = (input.status ?? existing.status) as TodoStatus;
  const statusChanged =
    input.status !== undefined && input.status !== existing.status;

  let nextPosition = input.position ?? existing.position;

  if (statusChanged && input.position === undefined) {
    nextPosition = await nextPositionForStatus(userId, nextStatus);
  }

  const patch: {
    title?: string;
    description?: string | null;
    project?: string | null;
    status?: string;
    tags?: string[];
    position?: number;
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (input.title !== undefined) {
    patch.title = input.title;
  }

  if (input.description !== undefined) {
    patch.description =
      input.description === "" ? null : input.description;
  }

  if (input.project !== undefined) {
    patch.project = input.project;
  }

  if (input.status !== undefined) {
    patch.status = input.status;
  }

  if (input.tags !== undefined) {
    patch.tags = input.tags;
  }

  if (statusChanged || input.position !== undefined) {
    patch.position = nextPosition;
  }

  const [row] = await db
    .update(todos)
    .set(patch)
    .where(and(eq(todos.id, todoId), eq(todos.userId, userId)))
    .returning(todoSelect);

  if (!row) {
    throw new Error("Todo tidak ditemukan.");
  }

  return toListItem(row);
}

export async function deleteTodo(
  userId: string,
  todoId: string
): Promise<void> {
  const deleted = await db
    .delete(todos)
    .where(and(eq(todos.id, todoId), eq(todos.userId, userId)))
    .returning({ id: todos.id });

  if (deleted.length === 0) {
    throw new Error("Todo tidak ditemukan.");
  }
}

export async function reorderTodosInStatus(
  userId: string,
  status: TodoStatus,
  orderedIds: string[]
): Promise<TodoListItem[]> {
  await db.transaction(async (tx) => {
    for (let index = 0; index < orderedIds.length; index++) {
      const id = orderedIds[index];
      const updated = await tx
        .update(todos)
        .set({ position: index, updatedAt: new Date() })
        .where(
          and(
            eq(todos.id, id),
            eq(todos.userId, userId),
            eq(todos.status, status)
          )
        )
        .returning({ id: todos.id });

      if (updated.length === 0) {
        throw new Error("Todo tidak ditemukan.");
      }
    }
  });

  return listTodosByUserId(userId);
}
