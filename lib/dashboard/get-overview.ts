import { listChatsForUser } from "@/lib/db/repositories/chat-repository";
import { listScheduledJobsForUser } from "@/lib/db/repositories/schedule-repository";
import { getQuota } from "@/lib/files/repository";
import type { QuotaInfo } from "@/lib/files/schemas";
import { countMemories } from "@/lib/memory/repository";
import { listTodosByUserId } from "@/lib/todos/repository";
import type { TodoListItem } from "@/lib/todos/schemas";
import type { TodoStatus } from "@/lib/db/schema";

const JAKARTA = "Asia/Jakarta";
const ATTENTION_LIMIT = 6;
const RECENT_CHAT_LIMIT = 5;
const UPCOMING_SCHEDULE_LIMIT = 3;

export type AttentionReason =
  | "overdue"
  | "starts_today"
  | "ends_today"
  | "schedule_error";

export interface AttentionItem {
  id: string;
  kind: "todo" | "schedule";
  title: string;
  subtitle: string | null;
  reason: AttentionReason;
  href: string;
}

export interface DashboardOverview {
  displayName: string;
  todayLabel: string;
  todos: {
    openCount: number;
    byStatus: Record<TodoStatus, number>;
  };
  schedules: {
    activeCount: number;
    pausedCount: number;
    upcoming: Array<{
      id: string;
      title: string;
      nextRunAt: string;
    }>;
  };
  memories: { count: number };
  storage: QuotaInfo;
  attention: AttentionItem[];
  recentChats: Array<{
    id: string;
    title: string;
    updatedAt: string;
  }>;
  isFirstUse: boolean;
}

function jakartaYmd(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function jakartaDayBounds(now = new Date()): { start: Date; end: Date } {
  const ymd = jakartaYmd(now);
  const start = new Date(`${ymd}T00:00:00+07:00`);
  const end = new Date(`${ymd}T23:59:59.999+07:00`);
  return { start, end };
}

function formatTodayLabel(now = new Date()): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: JAKARTA,
  }).format(now);
}

function isOpenTodo(status: TodoStatus): boolean {
  return status !== "done";
}

function buildTodoAttention(
  todos: TodoListItem[],
  now: Date,
  dayStart: Date,
  dayEnd: Date
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const todo of todos) {
    if (!isOpenTodo(todo.status)) continue;

    const endsAt = todo.endsAt ? new Date(todo.endsAt) : null;
    const startsAt = todo.startsAt ? new Date(todo.startsAt) : null;

    if (endsAt && endsAt < now) {
      items.push({
        id: todo.id,
        kind: "todo",
        title: todo.title,
        subtitle: todo.code,
        reason: "overdue",
        href: `/dashboard/todos/${todo.id}`,
      });
      continue;
    }

    if (startsAt && startsAt >= dayStart && startsAt <= dayEnd) {
      items.push({
        id: todo.id,
        kind: "todo",
        title: todo.title,
        subtitle: todo.code,
        reason: "starts_today",
        href: `/dashboard/todos/${todo.id}`,
      });
      continue;
    }

    if (endsAt && endsAt >= dayStart && endsAt <= dayEnd) {
      items.push({
        id: todo.id,
        kind: "todo",
        title: todo.title,
        subtitle: todo.code,
        reason: "ends_today",
        href: `/dashboard/todos/${todo.id}`,
      });
    }
  }

  const priority: Record<AttentionReason, number> = {
    overdue: 0,
    starts_today: 1,
    ends_today: 2,
    schedule_error: 3,
  };

  return items.sort((a, b) => priority[a.reason] - priority[b.reason]);
}

export async function getDashboardOverview(
  userId: string,
  displayName: string
): Promise<DashboardOverview> {
  const now = new Date();
  const { start: dayStart, end: dayEnd } = jakartaDayBounds(now);

  const [todos, schedules, memoriesCount, storage, chats] = await Promise.all([
    listTodosByUserId(userId),
    listScheduledJobsForUser(userId),
    countMemories(userId),
    getQuota(userId),
    listChatsForUser(userId),
  ]);

  const byStatus: Record<TodoStatus, number> = {
    todo: 0,
    in_progress: 0,
    waiting: 0,
    done: 0,
  };

  for (const todo of todos) {
    byStatus[todo.status] = (byStatus[todo.status] ?? 0) + 1;
  }

  const openCount = byStatus.todo + byStatus.in_progress + byStatus.waiting;

  const activeSchedules = schedules.filter((s) => s.status === "active");
  const pausedCount = schedules.filter((s) => s.status === "paused").length;

  const scheduleErrors: AttentionItem[] = activeSchedules
    .filter((s) => Boolean(s.lastError))
    .map((s) => ({
      id: s.id,
      kind: "schedule" as const,
      title: s.title,
      subtitle: s.lastError,
      reason: "schedule_error" as const,
      href: "/dashboard/schedules",
    }));

  const todoAttention = buildTodoAttention(todos, now, dayStart, dayEnd);
  const attention = [...todoAttention, ...scheduleErrors].slice(
    0,
    ATTENTION_LIMIT
  );

  const upcoming = activeSchedules
    .filter((s) => s.nextRunAt)
    .sort(
      (a, b) =>
        (a.nextRunAt?.getTime() ?? Number.POSITIVE_INFINITY) -
        (b.nextRunAt?.getTime() ?? Number.POSITIVE_INFINITY)
    )
    .slice(0, UPCOMING_SCHEDULE_LIMIT)
    .map((s) => ({
      id: s.id,
      title: s.title,
      nextRunAt: s.nextRunAt!.toISOString(),
    }));

  const recentChats = chats.slice(0, RECENT_CHAT_LIMIT).map((chat) => ({
    id: chat.id,
    title: chat.title,
    updatedAt: chat.updatedAt.toISOString(),
  }));

  const isFirstUse =
    todos.length === 0 &&
    schedules.length === 0 &&
    memoriesCount === 0 &&
    chats.length === 0 &&
    storage.usedBytes === 0;

  return {
    displayName,
    todayLabel: formatTodayLabel(now),
    todos: { openCount, byStatus },
    schedules: {
      activeCount: activeSchedules.length,
      pausedCount,
      upcoming,
    },
    memories: { count: memoriesCount },
    storage,
    attention,
    recentChats,
    isFirstUse,
  };
}
