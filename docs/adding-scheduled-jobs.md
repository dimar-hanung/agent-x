# Scheduled Jobs (Otomatisasi)

AgentX supports **recurring** automated AI jobs: users create them via chat, a background worker runs them with `node-schedule`, and they appear in the chat sidebar and the dashboard **Otomatisasi** page.

One-time reminders belong on **todos** (`starts_at`), not here.

## Prerequisites

- PostgreSQL schema pushed (`npm run db:push`)
- `.env.local` with `DATABASE_URL`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`
- Chat user role `client` or `admin` (not `guest`)

## Run the worker

Start the Next.js app and the scheduler worker in separate terminals:

```bash
npm run dev
npm run scheduler:worker
```

Optional env:

| Variable | Default | Description |
|----------|---------|-------------|
| `SCHEDULER_POLL_INTERVAL_MS` | `15000` | How often the worker syncs jobs from the database |

The same worker also processes todo `starts_at` / `notify_reminder_at` WhatsApp notifications.

## Chat examples

Create a recurring automation:

> Setiap pagi jam 9 rangkum inbox saya

One-time reminder (uses todo, not schedule):

> Besok jam 15:00 ingatkan saya review PR

List or cancel via chat:

> Tampilkan otomatisasi aktif saya

> Batalkan otomatisasi {job_id}

## UI

- **Chat sidebar** — active automations under **Otomatisasi aktif**; **Batal** to cancel
- **Dashboard → Otomatisasi** (`/dashboard/schedules`) — list cron jobs, filter, **Jeda** / **Lanjut** / **Batal**
- Create remains chat-only (`create_schedule`, cron only)

## API

| Method | Path | Notes |
|--------|------|-------|
| `GET` | `/api/schedules?status=` | Cron only; `active` (default), `paused`, `completed`, `cancelled`, or `all` |
| `PATCH` | `/api/schedules/[id]` | `{ "action": "pause" \| "resume" }` |
| `DELETE` | `/api/schedules/[id]` | Cancel active or paused |
| `GET` | `/api/schedules/watch` | Polling payload for chat live updates |

## Architecture

```
Chat tool create_schedule (cron only) → scheduled_jobs
Dashboard Otomatisasi → list / pause / resume / cancel
scheduler:worker → node-schedule → run-scheduled-prompt → ToolLoopAgent → saveChat
scheduler:worker → process-todo-notifications (todo starts_at / reminders)
```

## Native tools

| Key | Purpose |
|-----|---------|
| `create_schedule` | Create recurring cron job only |
| `list_schedules` | List user's cron automations |
| `cancel_schedule` | Cancel by job ID |

Registration follows [adding-ai-tools.md](./adding-ai-tools.md).

## Notes

- Scheduled runs execute in the chat linked when the job was created (or a new chat if none).
- `create_schedule` is disabled during scheduled runs to avoid nested scheduling.
- Recurring jobs stay `active` with updated `nextRunAt` after each run.
- Pause sets status `paused` (worker unregisters); resume recomputes `nextRunAt`.
- Do not auto-create todo rows from schedules.
