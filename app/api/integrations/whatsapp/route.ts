import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import { getUserPairingStatus } from "@/lib/integrations/whatsapp-channel-repository";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const status = await getUserPairingStatus(user.userId);
  return NextResponse.json(status);
}
