---
name: develop-feature-scheduler
description: >-
  Develop or extend AgentX scheduled jobs (dashboard Otomatisasi, pause/resume,
  worker, AI create/list/cancel tools). Use when working on schedules UI, API,
  repository, or the scheduler worker.
---

# Develop Feature: Scheduler (Otomatisasi)

## When to Use

- Changing schedule dashboard (`/dashboard/schedules`, UI label **Otomatisasi**)
- Touching `scheduled_jobs` repository, pause/resume/cancel, or schedule APIs
- Working on `scheduler:worker`, parse/format helpers, or schedule AI tools

## Overview

User-scoped **recurring** AI automations (`schedule_kind: cron` only). Created via chat `create_schedule`; managed on dashboard **Otomatisasi**. One-time reminders use todos (`starts_at`), not schedules.

## Key locations

| Area | Path |
|------|------|
| Schema | `lib/db/schema.ts` — `scheduledJobs` |
| Repository | `lib/db/repositories/schedule-repository.ts` |
| Parse / next run | `lib/scheduler/parse-schedule.ts` |
| Format labels | `lib/scheduler/format-schedule.ts` |
| Worker | `lib/scheduler/worker.ts`, `run-scheduled-prompt.ts` |
| Todo notifies (same worker) | `lib/scheduler/process-todo-notifications.ts` |
| Dashboard | `app/dashboard/schedules/`, `components/dashboard/schedules/` |
| API | `app/api/schedules/`, `app/api/schedules/[id]/`, `app/api/schedules/watch/` |
| Chat sidebar | `components/chat/schedule-list.tsx` |
| AI tools | `lib/ai/tools/{create,list,cancel}-schedule/` |
| Docs | `docs/adding-scheduled-jobs.md` |
| Route | `appRoutes.schedules` in `lib/site-config.ts` |

## Behavior agents must know

- **Only cron** may be inserted; `createScheduledJob` rejects `once`
- One-time timed tasks → `create_todo` + `starts_at`
- Statuses: `active` \| `paused` \| `completed` \| `cancelled`
- Lists (API, dashboard, chat, list_schedules) filter `scheduleKind: cron`
- Dashboard: list, filter, pause, resume, cancel
- UI Bahasa Indonesia label: **Otomatisasi** (not Jadwal)
- Not the same as todo `starts_at` reminders
- Scheduled runs go through `processChannelMessage` (`source: "scheduler"`) and mirror replies to WhatsApp when channel + phone are set
- Todo due query (`listTodosDueToStart`) must use drizzle `lte` / `isNotNull` — never interpolate a `Date` into `sql\`...\`` (postgres.js throws and crash-loops the worker)
- Worker `syncSchedules` must not let todo-notify failures kill cron registration (log and continue)
- Run via PM2 `agentx-scheduler` (`npm run scheduler:worker`, env `--env-file=.env`)
