import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import {
  listActiveSchedulesForUser,
  listScheduledJobsForUser,
  type ScheduleStatus,
} from "@/lib/db/repositories/schedule-repository";

const SCHEDULE_STATUSES = [
  "active",
  "paused",
  "completed",
  "cancelled",
] as const satisfies readonly ScheduleStatus[];

function isScheduleStatus(value: string): value is ScheduleStatus {
  return (SCHEDULE_STATUSES as readonly string[]).includes(value);
}

function serializeSchedule(
  schedule: Awaited<ReturnType<typeof listScheduledJobsForUser>>[number]
) {
  return {
    id: schedule.id,
    title: schedule.title,
    prompt: schedule.prompt,
    scheduleKind: schedule.scheduleKind,
    status: schedule.status,
    cronExpression: schedule.cronExpression,
    timezone: schedule.timezone,
    runAt: schedule.runAt?.toISOString() ?? null,
    nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
    lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
    lastError: schedule.lastError,
    runCount: schedule.runCount,
    createdAt: schedule.createdAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");

  if (!statusParam || statusParam === "active") {
    const schedules = await listActiveSchedulesForUser(user.userId);
    return NextResponse.json({
      schedules: schedules.map(serializeSchedule),
    });
  }

  if (statusParam === "all") {
    const schedules = await listScheduledJobsForUser(user.userId, {
      scheduleKind: "cron",
    });
    return NextResponse.json({
      schedules: schedules.map(serializeSchedule),
    });
  }

  if (!isScheduleStatus(statusParam)) {
    return NextResponse.json(
      { message: "Status tidak valid." },
      { status: 400 }
    );
  }

  const schedules = await listScheduledJobsForUser(user.userId, {
    status: statusParam,
    scheduleKind: "cron",
  });

  return NextResponse.json({
    schedules: schedules.map(serializeSchedule),
  });
}
