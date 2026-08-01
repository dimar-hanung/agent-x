import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import { generateChatSummary } from "@/lib/integrations/whatsapp-inbox/summary/service";

function requireClientOrAdmin(role: string) {
  return role === "client" || role === "admin";
}

export async function POST(
  req: Request,
  context: { params: Promise<{ chatId: string }> }
) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  if (!requireClientOrAdmin(user.role)) {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const { chatId } = await context.params;
  let since: Date | undefined;

  try {
    const body = (await req.json()) as { since?: string };
    if (body.since) {
      since = new Date(body.since);
    }
  } catch {
    // Empty body is fine.
  }

  const result = await generateChatSummary(user.userId, chatId, {
    since,
    abortSignal: req.signal,
  });

  if ("success" in result && result.success === false) {
    return NextResponse.json({ message: result.message }, { status: 400 });
  }

  return NextResponse.json(result);
}
