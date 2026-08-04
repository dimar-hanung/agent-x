import Link from "next/link";
import {
  AlertTriangle,
  BookMarked,
  CalendarClock,
  CheckSquare,
  FolderOpen,
  MessageSquare,
} from "lucide-react";

import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { Button } from "@/components/ui/button";
import type {
  AttentionItem,
  AttentionReason,
  DashboardOverview,
} from "@/lib/dashboard/get-overview";
import { formatBytes } from "@/lib/files/format-bytes";
import { formatNextRunAt } from "@/lib/scheduler/format-schedule";
import { appRoutes } from "@/lib/site-config";
import { TODO_STATUS_LABELS } from "@/lib/todos/labels";
import { cn } from "@/lib/utils";

const ATTENTION_LABELS: Record<AttentionReason, string> = {
  overdue: "Terlambat",
  starts_today: "Mulai hari ini",
  ends_today: "Batas hari ini",
  schedule_error: "Gagal jalan",
};

function formatRelativeUpdated(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} mnt lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const isError = item.reason === "schedule_error" || item.reason === "overdue";

  return (
    <Link
      href={item.href}
      className="hover:bg-muted/50 flex items-start gap-3 px-4 py-3 transition-colors duration-150"
    >
      <AlertTriangle
        className={cn(
          "mt-0.5 size-5 shrink-0",
          isError ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{item.title}</span>
        <span className="text-muted-foreground mt-0.5 block">
          {ATTENTION_LABELS[item.reason]}
          {item.subtitle && item.kind === "todo" ? ` · ${item.subtitle}` : null}
        </span>
        {item.kind === "schedule" && item.subtitle ? (
          <span className="text-muted-foreground mt-1 line-clamp-1 block">
            {item.subtitle}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

interface DashboardOverviewProps {
  data: DashboardOverview;
}

export function DashboardOverviewView({ data }: DashboardOverviewProps) {
  const firstName = data.displayName.trim().split(/\s+/)[0] || data.displayName;
  const openBreakdown = [
    data.todos.byStatus.in_progress > 0
      ? `${data.todos.byStatus.in_progress} ${TODO_STATUS_LABELS.in_progress}`
      : null,
    data.todos.byStatus.waiting > 0
      ? `${data.todos.byStatus.waiting} ${TODO_STATUS_LABELS.waiting}`
      : null,
    data.todos.byStatus.todo > 0
      ? `${data.todos.byStatus.todo} ${TODO_STATUS_LABELS.todo}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  if (data.isFirstUse) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Halo, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1">{data.todayLabel}</p>
        </div>
        <DashboardEmptyState
          icon={<MessageSquare aria-hidden />}
          title="Mulai dari chat"
          description="Tanya agent, buat todo, atau minta otomatisasi. Semua hasilnya muncul di sini."
          action={{ label: "Buka chat", href: appRoutes.chat }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Halo, {firstName}
          </h1>
          <p className="text-muted-foreground mt-1">{data.todayLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="lg">
            <Link href={appRoutes.chat}>
              <MessageSquare />
              Buka chat
            </Link>
          </Button>
          {data.attention.length > 0 ? (
            <Button asChild variant="outline" size="lg">
              <Link href={appRoutes.todos}>Lihat todo</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {data.attention.length > 0 ? (
        <section aria-labelledby="attention-heading" className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="attention-heading" className="text-lg font-medium">
              Perlu perhatian
            </h2>
            <p className="text-muted-foreground tabular-nums">
              {data.attention.length} item
            </p>
          </div>
          <div className="surface-panel divide-y overflow-hidden rounded-lg border">
            {data.attention.map((item) => (
              <AttentionRow key={`${item.kind}-${item.id}`} item={item} />
            ))}
          </div>
        </section>
      ) : (
        <section
          aria-label="Status hari ini"
          className="surface-panel rounded-lg border px-4 py-3"
        >
          <p className="font-medium">Tidak ada yang mendesak</p>
          <p className="text-muted-foreground mt-0.5">
            Todo dan otomatisasi terlihat aman untuk hari ini.
          </p>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="snapshot-heading" className="space-y-3">
          <h2 id="snapshot-heading" className="text-lg font-medium">
            Ringkasan
          </h2>
          <div className="surface-panel divide-y overflow-hidden rounded-lg border">
            <Link
              href={appRoutes.todos}
              className="hover:bg-muted/50 flex items-start gap-3 px-4 py-3 transition-colors duration-150"
            >
              <CheckSquare
                className="text-muted-foreground mt-0.5 size-5 shrink-0"
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">Todo terbuka</span>
                  <span className="tabular-nums font-medium">
                    {data.todos.openCount}
                  </span>
                </span>
                <span className="text-muted-foreground mt-0.5 block">
                  {data.todos.openCount === 0
                    ? "Belum ada tugas terbuka"
                    : openBreakdown || "Lihat semua tugas"}
                </span>
              </span>
            </Link>

            <Link
              href={appRoutes.schedules}
              className="hover:bg-muted/50 flex items-start gap-3 px-4 py-3 transition-colors duration-150"
            >
              <CalendarClock
                className="text-muted-foreground mt-0.5 size-5 shrink-0"
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">Otomatisasi aktif</span>
                  <span className="tabular-nums font-medium">
                    {data.schedules.activeCount}
                  </span>
                </span>
                <span className="text-muted-foreground mt-0.5 block">
                  {data.schedules.pausedCount > 0
                    ? `${data.schedules.pausedCount} dijeda`
                    : data.schedules.upcoming[0]
                      ? `Berikutnya ${formatNextRunAt(new Date(data.schedules.upcoming[0].nextRunAt), "Asia/Jakarta")}`
                      : "Belum ada jadwal aktif"}
                </span>
              </span>
            </Link>

            <Link
              href={appRoutes.memories}
              className="hover:bg-muted/50 flex items-start gap-3 px-4 py-3 transition-colors duration-150"
            >
              <BookMarked
                className="text-muted-foreground mt-0.5 size-5 shrink-0"
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">Memory</span>
                  <span className="tabular-nums font-medium">
                    {data.memories.count}
                  </span>
                </span>
                <span className="text-muted-foreground mt-0.5 block">
                  {data.memories.count === 0
                    ? "Belum ada memori tersimpan"
                    : "Preferensi yang diingat agent"}
                </span>
              </span>
            </Link>

            <Link
              href={appRoutes.files}
              className="hover:bg-muted/50 flex items-start gap-3 px-4 py-3 transition-colors duration-150"
            >
              <FolderOpen
                className="text-muted-foreground mt-0.5 size-5 shrink-0"
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">Penyimpanan</span>
                  <span className="tabular-nums font-medium">
                    {Math.round(data.storage.percent)}%
                  </span>
                </span>
                <span className="text-muted-foreground mt-0.5 block tabular-nums">
                  {formatBytes(data.storage.usedBytes)} dari{" "}
                  {formatBytes(data.storage.limitBytes)}
                </span>
                <span
                  className="bg-muted mt-2 block h-1.5 overflow-hidden rounded-full"
                  role="progressbar"
                  aria-valuenow={Math.round(data.storage.percent)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Pemakaian penyimpanan"
                >
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      data.storage.percent >= 90 ? "bg-amber-500" : "bg-primary"
                    )}
                    style={{
                      width: `${Math.min(100, data.storage.percent)}%`,
                    }}
                  />
                </span>
              </span>
            </Link>
          </div>
        </section>

        <section aria-labelledby="recent-chats-heading" className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="recent-chats-heading" className="text-lg font-medium">
              Chat terbaru
            </h2>
            <Link
              href={appRoutes.chat}
              className="text-primary font-medium hover:underline"
            >
              Semua chat
            </Link>
          </div>

          {data.recentChats.length === 0 ? (
            <DashboardEmptyState
              variant="inline"
              icon={<MessageSquare aria-hidden />}
              title="Belum ada chat"
              description="Buka chat untuk mulai percakapan baru."
              action={{ label: "Buka chat", href: appRoutes.chat }}
              className="surface-panel rounded-lg border"
            />
          ) : (
            <div className="surface-panel divide-y overflow-hidden rounded-lg border">
              {data.recentChats.map((chat) => (
                <Link
                  key={chat.id}
                  href={`${appRoutes.chat}/${chat.id}`}
                  className="hover:bg-muted/50 flex items-start gap-3 px-4 py-3 transition-colors duration-150"
                >
                  <MessageSquare
                    className="text-muted-foreground mt-0.5 size-5 shrink-0"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {chat.title || "Chat tanpa judul"}
                    </span>
                    <span
                      className="text-muted-foreground mt-0.5 block"
                      title={new Date(chat.updatedAt).toLocaleString("id-ID", {
                        timeZone: "Asia/Jakarta",
                      })}
                    >
                      {formatRelativeUpdated(chat.updatedAt)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}

          {data.schedules.upcoming.length > 0 ? (
            <div className="space-y-3 pt-2">
              <h3 className="font-medium">Jadwal berikutnya</h3>
              <ul className="surface-panel divide-y overflow-hidden rounded-lg border">
                {data.schedules.upcoming.map((job) => (
                  <li key={job.id}>
                    <Link
                      href={appRoutes.schedules}
                      className="hover:bg-muted/50 block px-4 py-3 transition-colors duration-150"
                    >
                      <p className="font-medium">{job.title}</p>
                      <p className="text-muted-foreground mt-0.5">
                        {formatNextRunAt(
                          new Date(job.nextRunAt),
                          "Asia/Jakarta"
                        )}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
