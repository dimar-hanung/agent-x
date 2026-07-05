import { NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/auth/require-admin";
import {
  disconnectChannel,
  startChannelPairing,
  syncChannelConnectionStatus,
} from "@/lib/integrations/whatsapp-channel-repository";

export async function GET() {
  const auth = await requireAdminUser();

  if (auth.error) {
    return auth.error;
  }

  const config = await syncChannelConnectionStatus();
  return NextResponse.json(config);
}

export async function POST() {
  const auth = await requireAdminUser();

  if (auth.error) {
    return auth.error;
  }

  try {
    const config = await startChannelPairing();
    return NextResponse.json(config);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal memulai pairing channel WhatsApp.";

    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE() {
  const auth = await requireAdminUser();

  if (auth.error) {
    return auth.error;
  }

  try {
    const config = await disconnectChannel();
    return NextResponse.json(config);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal memutuskan channel WhatsApp.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
