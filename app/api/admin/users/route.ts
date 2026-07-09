import { NextResponse } from "next/server";

import {
  createUserWithWhatsApp,
  listUsers,
} from "@/lib/admin/users/repository";
import { createAdminUserSchema } from "@/lib/admin/users/schemas";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { isChannelConnected } from "@/lib/integrations/whatsapp-channel-repository";

export async function GET() {
  const auth = await requireAdminUser();

  if (auth.error) {
    return auth.error;
  }

  const users = await listUsers();
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const auth = await requireAdminUser();

  if (auth.error) {
    return auth.error;
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Body JSON tidak valid." }, { status: 400 });
  }

  const parsed = createAdminUserSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Data tidak valid.";
    return NextResponse.json({ message: firstError }, { status: 400 });
  }

  const connected = await isChannelConnected();

  if (!connected) {
    return NextResponse.json(
      { message: "Channel WhatsApp belum aktif. Hubungkan channel terlebih dahulu." },
      { status: 400 }
    );
  }

  try {
    const user = await createUserWithWhatsApp(parsed.data);
    return NextResponse.json({ user, message: "User berhasil dibuat." }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat user.";

    if (message.includes("sudah terdaftar")) {
      return NextResponse.json({ message }, { status: 409 });
    }

    if (
      message.includes("nomor HP") ||
      message.includes("Nomor HP") ||
      message.includes("Channel WhatsApp")
    ) {
      return NextResponse.json({ message }, { status: 400 });
    }

    return NextResponse.json(
      { message: "Gagal mengirim pesan WhatsApp. User tidak dibuat." },
      { status: 502 }
    );
  }
}
