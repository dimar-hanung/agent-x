import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import { verifyGmailConnection } from "@/lib/gmail/smtp";
import {
  deleteGmailIntegration,
  getGmailIntegrationStatus,
  upsertGmailIntegration,
} from "@/lib/integrations/gmail-repository";
import { connectGmailSchema } from "@/lib/integrations/schemas";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const status = await getGmailIntegrationStatus(user.userId);
  return NextResponse.json(status);
}

export async function POST(req: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = connectGmailSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid request.", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, appPassword } = parsed.data;
  const credentials = { email: email.toLowerCase(), appPassword };

  try {
    await verifyGmailConnection(credentials);
  } catch {
    return NextResponse.json(
      {
        message:
          "Could not connect to Gmail. Check your email and app password, and ensure 2-Step Verification is enabled.",
      },
      { status: 400 }
    );
  }

  try {
    const status = await upsertGmailIntegration(user.userId, credentials);
    return NextResponse.json(status);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save integration.";

    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  await deleteGmailIntegration(user.userId);
  return NextResponse.json({ connected: false });
}
