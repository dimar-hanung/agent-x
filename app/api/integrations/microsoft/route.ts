import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import {
  deleteMicrosoftIntegration,
  getMicrosoftIntegrationStatus,
} from "@/lib/integrations/microsoft-repository";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const status = await getMicrosoftIntegrationStatus(user.userId);
  return NextResponse.json(status);
}

export async function DELETE() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  await deleteMicrosoftIntegration(user.userId);
  return NextResponse.json({ connected: false });
}
