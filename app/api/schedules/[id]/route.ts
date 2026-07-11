import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth/get-session-user";
import {
  cancelScheduledJob,
  pauseScheduledJob,
  resumeScheduledJob,
} from "@/lib/db/repositories/schedule-repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const patchScheduleSchema = z.object({
  action: z.enum(["pause", "resume"]),
});

export async function PATCH(req: Request, context: RouteContext) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const parsed = patchScheduleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Aksi tidak valid. Gunakan pause atau resume." },
      { status: 400 }
    );
  }

  try {
    if (parsed.data.action === "pause") {
      const schedule = await pauseScheduledJob(id, user.userId);

      if (!schedule) {
        return NextResponse.json(
          { message: "Otomatisasi tidak ditemukan atau tidak aktif." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        message: "Otomatisasi dijeda.",
        schedule: {
          id: schedule.id,
          status: schedule.status,
          nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
        },
      });
    }

    const schedule = await resumeScheduledJob(id, user.userId);

    if (!schedule) {
      return NextResponse.json(
        { message: "Otomatisasi tidak ditemukan atau tidak dijeda." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Otomatisasi dilanjutkan.",
      schedule: {
        id: schedule.id,
        status: schedule.status,
        nextRunAt: schedule.nextRunAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal memperbarui otomatisasi.";
    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const cancelled = await cancelScheduledJob(id, user.userId);

  if (!cancelled) {
    return NextResponse.json(
      { message: "Otomatisasi tidak ditemukan atau sudah tidak aktif." },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: "Otomatisasi dibatalkan." });
}
