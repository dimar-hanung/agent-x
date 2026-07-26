import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import {
  MICROSOFT_OAUTH_STATE_COOKIE,
  buildMicrosoftAuthUrl,
} from "@/lib/microsoft/oauth";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const state = randomBytes(24).toString("hex");
    const authUrl = buildMicrosoftAuthUrl(state);
    const response = NextResponse.redirect(authUrl);

    response.cookies.set(MICROSOFT_OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Gagal memulai koneksi Microsoft.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
