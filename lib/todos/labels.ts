import type { TodoStatus } from "@/lib/db/schema";

export const TODO_STATUS_LABELS: Record<TodoStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  waiting: "Menunggu",
  done: "Selesai",
};

export const TODO_STATUS_ORDER: TodoStatus[] = [
  "todo",
  "in_progress",
  "waiting",
  "done",
];

export function formatTodoStatus(status: TodoStatus): string {
  return TODO_STATUS_LABELS[status] ?? status;
}

export function formatTodoDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}
