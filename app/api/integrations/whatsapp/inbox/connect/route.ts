import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import {
  disconnectUserInstance,
  getUserInstance,
  startUserPairing,
} from "@/lib/integrations/whatsapp-inbox/user-instance-repository";

function requireClientOrAdmin(role: string) {
  return role === "client" || role === "admin";
}

export async function POST() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (!requireClientOrAdmin(user.role)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  try {
    const instance = await startUserPairing(user.userId);
    return NextResponse.json(instance);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Gagal memulai koneksi WhatsApp.",
      },
      { status: 503 }
    );
  }
}

export async function DELETE() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (!requireClientOrAdmin(user.role)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const instance = await disconnectUserInstance(user.userId);
  return NextResponse.json(instance);
}

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (!requireClientOrAdmin(user.role)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const instance = await getUserInstance(user.userId);
  return NextResponse.json(instance);
}
