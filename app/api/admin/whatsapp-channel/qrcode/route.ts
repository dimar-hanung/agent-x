import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/require-admin";
import {
  getChannelQrCode,
  syncChannelConnectionStatus,
} from "@/lib/integrations/whatsapp-channel-repository";

export async function GET() {
  const auth = await requireAdminUser();

  if (auth.error) {
    return auth.error;
  }

  try {
    const config = await syncChannelConnectionStatus();

    if (config.status === "connected") {
      return NextResponse.json({ connected: true, config });
    }

    const qr = await getChannelQrCode();

    if (!qr) {
      return NextResponse.json(
        { message: "QR tidak tersedia. Coba mulai pairing lagi." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      connected: false,
      config,
      qr,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal mengambil QR code.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
