import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

import type { TodoStatus } from "@/lib/db/schema";
import { formatTodoDate } from "@/lib/todos/labels";
import type { TodoListItem } from "@/lib/todos/schemas";

const STATUS_META: Record<
  TodoStatus,
  { emoji: string; label: string }
> = {
  todo: { emoji: "📋", label: "To Do" },
  in_progress: { emoji: "🔄", label: "In Progress" },
  waiting: { emoji: "⏳", label: "Menunggu" },
  done: { emoji: "✅", label: "Selesai" },
};

function statusLine(status: TodoStatus): string {
  const meta = STATUS_META[status] ?? { emoji: "•", label: status };
  return `${meta.emoji} ${meta.label}`;
}

function formatTags(tags: string[]): string {
  if (tags.length === 0) return "—";
  return tags.map((tag) => `#${tag}`).join(" ");
}

function formatTodoBlock(todo: TodoListItem): string {
  const lines = [
    `### ${statusLine(todo.status)} · \`${todo.code}\``,
    `**${todo.title}**`,
  ];

  if (todo.description) {
    lines.push(`📝 ${todo.description}`);
  }

  lines.push(
    `📁 Project: ${todo.project ?? "—"}`,
    `🏷️ Tag: ${formatTags(todo.tags)}`,
    `🆔 \`${todo.id}\``,
    `🕒 Dibuat: ${formatTodoDate(todo.createdAt)} · Diubah: ${formatTodoDate(todo.updatedAt)}`
  );

  return lines.join("\n");
}

function buildSummary(todos: TodoListItem[]): string {
  const counts: Record<TodoStatus, number> = {
    todo: 0,
    in_progress: 0,
    waiting: 0,
    done: 0,
  };

  for (const todo of todos) {
    counts[todo.status] = (counts[todo.status] ?? 0) + 1;
  }

  const parts = (Object.keys(STATUS_META) as TodoStatus[]).map((status) => {
    const meta = STATUS_META[status];
    return `${meta.emoji} ${meta.label}: **${counts[status]}**`;
  });

  return [
    `## 📊 Ringkasan`,
    `Total: **${todos.length}** todo`,
    parts.join(" · "),
  ].join("\n");
}

export function textResult(text: string): CallToolResult {
  return {
    content: [{ type: "text", text }],
  };
}

export function errorResult(message: string): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: [`## ❌ Gagal`, message].join("\n"),
      },
    ],
    isError: true,
  };
}

export function formatListTodosResult(
  todos: TodoListItem[],
  filters?: { status?: TodoStatus; project?: string }
): string {
  const filterBits: string[] = [];
  if (filters?.status) {
    filterBits.push(`status ${statusLine(filters.status)}`);
  }
  if (filters?.project) {
    filterBits.push(`project **${filters.project}**`);
  }

  const header = [
    `## 📌 Daftar Todo`,
    filterBits.length > 0
      ? `Filter: ${filterBits.join(" · ")}`
      : `Filter: semua`,
    "",
    buildSummary(todos),
  ];

  if (todos.length === 0) {
    return [...header, "", "Belum ada todo yang cocok."].join("\n");
  }

  const byStatus: Partial<Record<TodoStatus, TodoListItem[]>> = {};
  for (const todo of todos) {
    const bucket = byStatus[todo.status] ?? [];
    bucket.push(todo);
    byStatus[todo.status] = bucket;
  }

  const sections: string[] = [];
  for (const status of Object.keys(STATUS_META) as TodoStatus[]) {
    const group = byStatus[status];
    if (!group || group.length === 0) continue;
    const meta = STATUS_META[status];
    sections.push(
      `## ${meta.emoji} ${meta.label} (${group.length})`,
      ...group.map((todo) => formatTodoBlock(todo))
    );
  }

  return [...header, "", ...sections].join("\n\n");
}

export function formatGetTodoResult(todo: TodoListItem): string {
  return [
    `## 🔍 Detail Todo`,
    formatTodoBlock(todo),
  ].join("\n\n");
}

export function formatCreateTodoResult(todo: TodoListItem): string {
  return [
    `## ✨ Todo dibuat`,
    formatTodoBlock(todo),
    "",
    `💡 Tip: pakai \`${todo.code}\` atau id untuk update/hapus.`,
  ].join("\n");
}

export function formatUpdateTodoResult(todo: TodoListItem): string {
  return [
    `## ✏️ Todo diperbarui`,
    formatTodoBlock(todo),
  ].join("\n\n");
}

export function formatDeleteTodoResult(id: string): string {
  return [
    `## 🗑️ Todo dihapus`,
    `ID: \`${id}\``,
    `Todo sudah dihapus permanen.`,
  ].join("\n");
}
