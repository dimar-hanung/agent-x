import { and, asc, desc, eq, isNotNull, lte, max, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { TODO_CODE_PREFIX, todos, type TodoStatus } from "@/lib/db/schema";

import type {
  CreateTodoInput,
  TodoListItem,
  UpdateTodoInput,
} from "./schemas";
import {
  resolveCreateTimeFields,
  resolveUpdateTimeFields,
} from "./time-fields";

function toListItem(row: {
  id: string;
  code: string;
  title: string;
  description: string | null;
  project: string | null;
  status: string;
  tags: string[] | null;
  position: number;
  startsAt: Date | null;
  endsAt: Date | null;
  notifyReminderAt: Date[] | null;
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
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    notifyReminderAt: (row.notifyReminderAt ?? []).map((d) => d.toISOString()),
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
  startsAt: todos.startsAt,
  endsAt: todos.endsAt,
  notifyReminderAt: todos.notifyReminderAt,
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

  const timeFields = resolveCreateTimeFields({
    startsAt: input.starts_at,
    endsAt: input.ends_at,
    notifyReminderAt: input.notify_reminder_at,
  });

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
          startsAt: timeFields.startsAt,
          endsAt: timeFields.endsAt,
          notifyReminderAt: timeFields.notifyReminderAt,
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
      startsAt: todos.startsAt,
      endsAt: todos.endsAt,
      notifyReminderAt: todos.notifyReminderAt,
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

  const timeFields = resolveUpdateTimeFields({
    existingStartsAt: existing.startsAt,
    existingEndsAt: existing.endsAt,
    existingReminders: existing.notifyReminderAt ?? [],
    startsAt: input.starts_at,
    endsAt: input.ends_at,
    notifyReminderAt: input.notify_reminder_at,
  });

  const patch: {
    title?: string;
    description?: string | null;
    project?: string | null;
    status?: string;
    tags?: string[];
    position?: number;
    startsAt?: Date | null;
    endsAt?: Date | null;
    notifyReminderAt?: Date[];
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

  if (timeFields) {
    patch.startsAt = timeFields.startsAt;
    patch.endsAt = timeFields.endsAt;
    patch.notifyReminderAt = timeFields.notifyReminderAt;
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

/** Todos with a due early reminder (any notify_reminder_at <= now). */
export async function listTodosWithDueReminders(
  now: Date = new Date()
): Promise<
  Array<{
    id: string;
    userId: string;
    code: string;
    title: string;
    startsAt: Date | null;
    notifyReminderAt: Date[];
  }>
> {
  const rows = await db
    .select({
      id: todos.id,
      userId: todos.userId,
      code: todos.code,
      title: todos.title,
      startsAt: todos.startsAt,
      notifyReminderAt: todos.notifyReminderAt,
    })
    .from(todos)
    .where(
      and(
        ne(todos.status, "done"),
        sql`cardinality(${todos.notifyReminderAt}) > 0`
      )
    );

  return rows
    .map((row) => ({
      ...row,
      notifyReminderAt: row.notifyReminderAt ?? [],
    }))
    .filter((row) =>
      row.notifyReminderAt.some((d) => d.getTime() <= now.getTime())
    );
}

/** Claim due reminder timestamps: remove those <= now, return removed. */
export async function claimDueReminders(
  todoId: string,
  now: Date = new Date()
): Promise<{
  userId: string;
  code: string;
  title: string;
  startsAt: Date | null;
  claimed: Date[];
} | null> {
  const [row] = await db
    .select({
      id: todos.id,
      userId: todos.userId,
      code: todos.code,
      title: todos.title,
      startsAt: todos.startsAt,
      notifyReminderAt: todos.notifyReminderAt,
      status: todos.status,
    })
    .from(todos)
    .where(and(eq(todos.id, todoId), ne(todos.status, "done")))
    .limit(1);

  if (!row) {
    return null;
  }

  const reminders = row.notifyReminderAt ?? [];
  const claimed = reminders.filter((d) => d.getTime() <= now.getTime());
  if (claimed.length === 0) {
    return null;
  }

  const remaining = reminders.filter((d) => d.getTime() > now.getTime());

  const [updated] = await db
    .update(todos)
    .set({
      notifyReminderAt: remaining,
      updatedAt: new Date(),
    })
    .where(and(eq(todos.id, todoId), ne(todos.status, "done")))
    .returning({ id: todos.id });

  if (!updated) {
    return null;
  }

  return {
    userId: row.userId,
    code: row.code,
    title: row.title,
    startsAt: row.startsAt,
    claimed,
  };
}

export async function listTodosDueToStart(
  now: Date = new Date()
): Promise<
  Array<{
    id: string;
    userId: string;
    code: string;
    title: string;
  }>
> {
  return db
    .select({
      id: todos.id,
      userId: todos.userId,
      code: todos.code,
      title: todos.title,
    })
    .from(todos)
    .where(
      and(
        ne(todos.status, "done"),
        isNotNull(todos.startsAt),
        lte(todos.startsAt, now)
      )
    );
}

/** Mark todo done after successful starts_at notify; clears time fields. */
export async function completeTodoAfterStartNotify(
  todoId: string
): Promise<boolean> {
  const [row] = await db
    .update(todos)
    .set({
      status: "done",
      startsAt: null,
      endsAt: null,
      notifyReminderAt: [],
      updatedAt: new Date(),
    })
    .where(and(eq(todos.id, todoId), ne(todos.status, "done")))
    .returning({ id: todos.id });

  return Boolean(row);
}
