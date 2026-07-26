import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import { listChatsWithSummaryFlag } from "@/lib/integrations/whatsapp-inbox/summary/service";
import {
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

  const instance = await syncUserConnectionStatus(user.userId);
  const chats = await listChatsWithSummaryFlag(user.userId);

  return NextResponse.json({ instance, chats });
}
