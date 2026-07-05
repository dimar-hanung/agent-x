import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUser } from "@/lib/auth/get-session-user";
import {
  clearUserWhatsAppPhone,
  isChannelConnected,
  setUserWhatsAppPhone,
} from "@/lib/integrations/whatsapp-channel-repository";

const phoneSchema = z.object({
  phone: z.string().min(8),
});

export async function PUT(req: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const connected = await isChannelConnected();

  if (!connected) {
    return NextResponse.json(
      { message: "Channel WhatsApp belum aktif. Hubungi admin." },
      { status: 503 }
    );
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = phoneSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Format nomor HP tidak valid." },
      { status: 400 }
    );
  }

  try {
    const phoneE164 = await setUserWhatsAppPhone(user.userId, parsed.data.phone);
    return NextResponse.json({ userPhoneE164: phoneE164 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal menyimpan nomor HP.";

    return NextResponse.json({ message }, { status: 400 });
  }
}

export async function DELETE() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  await clearUserWhatsAppPhone(user.userId);
  return NextResponse.json({ message: "Pairing dihapus." });
}
