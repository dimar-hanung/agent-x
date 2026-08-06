import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import { syncWhatsAppDirectory } from "@/lib/integrations/whatsapp-inbox/directory/sync-service";
import { isEvolutionConfigured } from "@/lib/integrations/whatsapp/env";
import { getUserInstance } from "@/lib/integrations/whatsapp-inbox/user-instance-repository";

export const maxDuration = 120;

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

  if (!isEvolutionConfigured()) {
    return NextResponse.json(
      { message: "Evolution API belum dikonfigurasi." },
      { status: 503 }
    );
  }

  const instance = await getUserInstance(user.userId);

  if (instance.status !== "connected") {
    return NextResponse.json(
      { message: "WhatsApp pribadi belum terhubung." },
      { status: 503 }
    );
  }

  try {
    const result = await syncWhatsAppDirectory(user.userId);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal menyinkronkan direktori WhatsApp.";

    return NextResponse.json({ message }, { status: 503 });
  }
}
