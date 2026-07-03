import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import { listScheduleWatchStateForUser } from "@/lib/db/repositories/schedule-repository";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const schedules = await listScheduleWatchStateForUser(user.userId);

  return NextResponse.json({
    schedules: schedules.map((schedule) => ({
      id: schedule.id,
      title: schedule.title,
      status: schedule.status,
      scheduleKind: schedule.scheduleKind,
      runCount: schedule.runCount,
      lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
      nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
      chatId: schedule.chatId,
      lastError: schedule.lastError,
    })),
  });
}
