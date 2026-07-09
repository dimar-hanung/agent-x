import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { TODO_STATUSES } from "@/lib/db/schema";
import {
  errorResult,
  formatCreateTodoResult,
  formatDeleteTodoResult,
  formatGetTodoResult,
  formatListTodosResult,
  formatUpdateTodoResult,
  textResult,
} from "@/lib/mcp/todos/format";
import {
  createTodo,
  deleteTodo,
  getTodoByIdOrCode,
  listTodosByUserId,
  updateTodo,
} from "@/lib/todos/repository";
import { createTodoSchema, updateTodoSchema } from "@/lib/todos/schemas";

function requireUserId(extra: {
  authInfo?: { extra?: Record<string, unknown> };
}): string {
  const userId = extra.authInfo?.extra?.userId;
  if (typeof userId !== "string" || !userId) {
    throw new Error("Tidak terautentikasi: konteks user hilang.");
  }
  return userId;
}

export function registerTodoMcpTools(server: McpServer): void {
  server.registerTool(
    "list_todos",
    {
      title: "List Todos",
      description:
        "List the authenticated user's todos. Optionally filter by status or project. Returns a Bahasa Indonesia structured summary with emoji for easy tracking.",
      inputSchema: {
        status: z
          .enum(TODO_STATUSES)
          .optional()
          .describe("Filter by status: todo, in_progress, waiting, or done."),
        project: z
          .string()
          .trim()
          .max(128)
          .optional()
          .describe("Filter by exact project name."),
      },
    },
    async (args, extra) => {
      try {
        const userId = requireUserId(extra);
        const filters = {
          status: args.status,
          project: args.project,
        };
        const todos = await listTodosByUserId(userId, filters);
        return textResult(formatListTodosResult(todos, filters));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Gagal memuat daftar todo.";
        return errorResult(message);
      }
    }
  );

  server.registerTool(
    "get_todo",
    {
      title: "Get Todo",
      description:
        "Get a single todo by UUID id or by code (e.g. TODO-1). Provide id or code. Returns Bahasa Indonesia structured detail with emoji.",
      inputSchema: {
        id: z.string().uuid().optional().describe("Todo UUID."),
        code: z
          .string()
          .trim()
          .min(1)
          .max(32)
          .optional()
          .describe("Todo code such as TODO-1."),
      },
    },
    async (args, extra) => {
      try {
        const userId = requireUserId(extra);

        if (!args.id && !args.code) {
          return errorResult("Isi id atau code todo.");
        }

        const todo = await getTodoByIdOrCode(userId, {
          id: args.id,
          code: args.code,
        });

        if (!todo) {
          return errorResult("Todo tidak ditemukan.");
        }

        return textResult(formatGetTodoResult(todo));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Gagal memuat todo.";
        return errorResult(message);
      }
    }
  );

  server.registerTool(
    "create_todo",
    {
      title: "Create Todo",
      description:
        "Create a todo for the authenticated user. Title is required; description, project, status, and tags are optional. Returns Bahasa Indonesia confirmation with emoji.",
      inputSchema: {
        title: z.string().trim().min(1).max(255).describe("Todo title."),
        description: z
          .string()
          .trim()
          .max(5000)
          .optional()
          .nullable()
          .describe("Optional description."),
        project: z
          .string()
          .trim()
          .max(128)
          .optional()
          .nullable()
          .describe("Optional project name."),
        status: z
          .enum(TODO_STATUSES)
          .optional()
          .describe("Initial status. Defaults to todo."),
        tags: z
          .array(z.string().trim().min(1).max(64))
          .max(20)
          .optional()
          .describe("Optional tags (max 20)."),
      },
    },
    async (args, extra) => {
      try {
        const userId = requireUserId(extra);
        const parsed = createTodoSchema.safeParse(args);

        if (!parsed.success) {
          const firstError =
            parsed.error.issues[0]?.message ?? "Data tidak valid.";
          return errorResult(firstError);
        }

        const todo = await createTodo(userId, parsed.data);
        return textResult(formatCreateTodoResult(todo));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Gagal membuat todo.";
        return errorResult(message);
      }
    }
  );

  server.registerTool(
    "update_todo",
    {
      title: "Update Todo",
      description:
        "Update an existing todo by UUID. At least one field besides id must be provided. Returns Bahasa Indonesia confirmation with emoji.",
      inputSchema: {
        id: z.string().uuid().describe("Todo UUID to update."),
        title: z.string().trim().min(1).max(255).optional(),
        description: z.string().trim().max(5000).optional().nullable(),
        project: z.string().trim().max(128).optional().nullable(),
        status: z.enum(TODO_STATUSES).optional(),
        tags: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
        position: z.number().int().min(0).optional(),
      },
    },
    async (args, extra) => {
      try {
        const userId = requireUserId(extra);
        const { id, ...rest } = args;
        const parsed = updateTodoSchema.safeParse(rest);

        if (!parsed.success) {
          const firstError =
            parsed.error.issues[0]?.message ?? "Data tidak valid.";
          return errorResult(firstError);
        }

        const todo = await updateTodo(userId, id, parsed.data);
        return textResult(formatUpdateTodoResult(todo));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Gagal memperbarui todo.";
        return errorResult(message);
      }
    }
  );

  server.registerTool(
    "delete_todo",
    {
      title: "Delete Todo",
      description:
        "Permanently delete a todo by UUID. Returns Bahasa Indonesia confirmation with emoji.",
      inputSchema: {
        id: z.string().uuid().describe("Todo UUID to delete."),
      },
    },
    async (args, extra) => {
      try {
        const userId = requireUserId(extra);
        await deleteTodo(userId, args.id);
        return textResult(formatDeleteTodoResult(args.id));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Gagal menghapus todo.";
        return errorResult(message);
      }
    }
  );
}
