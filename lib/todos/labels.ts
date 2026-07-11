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

/** Tailwind classes for status dots (kanban) and badges (table). */
export const TODO_STATUS_COLORS: Record<
  TodoStatus,
  { dot: string; badge: string }
> = {
  todo: {
    dot: "bg-slate-400",
    badge:
      "border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  in_progress: {
    dot: "bg-sky-500",
    badge:
      "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
  },
  waiting: {
    dot: "bg-amber-500",
    badge:
      "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  },
  done: {
    dot: "bg-emerald-500",
    badge:
      "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
};

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
