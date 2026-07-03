import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import { cancelScheduledJob } from "@/lib/db/repositories/schedule-repository";

interface RouteContext {
  params: Promise<{ id: string }>;
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
      { message: "Jadwal tidak ditemukan atau sudah tidak aktif." },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: "Jadwal dibatalkan." });
}
