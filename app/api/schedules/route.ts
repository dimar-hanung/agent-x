import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import { listActiveSchedulesForUser } from "@/lib/db/repositories/schedule-repository";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const schedules = await listActiveSchedulesForUser(user.userId);

  return NextResponse.json({
    schedules: schedules.map((schedule) => ({
      id: schedule.id,
      title: schedule.title,
      scheduleKind: schedule.scheduleKind,
      timezone: schedule.timezone,
      nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
      runCount: schedule.runCount,
      createdAt: schedule.createdAt.toISOString(),
    })),
  });
}
