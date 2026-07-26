import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import {
  getUserQrCode,
  syncUserConnectionStatus,
} from "@/lib/integrations/whatsapp-inbox/user-instance-repository";

function requireClientOrAdmin(role: string) {
  return role === "client" || role === "admin";
}

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (!requireClientOrAdmin(user.role)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  try {
    const instance = await syncUserConnectionStatus(user.userId);

    if (instance.status === "connected") {
      return NextResponse.json({ connected: true, instance });
    }

    const qr = await getUserQrCode(user.userId);

    return NextResponse.json({
      connected: false,
      instance,
      qr,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengambil QR WhatsApp.",
      },
      { status: 503 }
    );
  }
}
