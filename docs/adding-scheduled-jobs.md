# Scheduled Jobs

AgentX supports dynamic schedules: users create jobs via chat, a background worker runs them with `node-schedule`, and active schedules appear in the chat sidebar.

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

## Chat examples

Create a recurring job:

> Ingatkan saya setiap pagi jam 9 untuk merangkum inbox

Create a one-time job:

> Besok jam 15:00 kirim pengingat untuk review PR

List or cancel via chat:

> Tampilkan jadwal aktif saya

> Batalkan jadwal {job_id}

## UI

Active schedules for the logged-in user appear under **Jadwal aktif** in the chat sidebar. Use **Batal** to cancel without typing in chat.

## Architecture

```
Chat tool create_schedule → scheduled_jobs (PostgreSQL)
scheduler:worker → node-schedule → run-scheduled-prompt → ToolLoopAgent → saveChat
```

## Native tools

| Key | Purpose |
|-----|---------|
| `create_schedule` | Create cron or one-time job |
| `list_schedules` | List user's schedules |
| `cancel_schedule` | Cancel by job ID |

Registration follows [adding-ai-tools.md](./adding-ai-tools.md).

## Notes

- Scheduled runs execute in the chat linked when the job was created (or a new chat if none).
- `create_schedule` is disabled during scheduled runs to avoid nested scheduling.
- One-time jobs move to `completed` after a successful run; recurring jobs stay `active`.
