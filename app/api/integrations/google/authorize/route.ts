import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  buildGoogleAuthUrl,
} from "@/lib/google/oauth";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const state = randomBytes(24).toString("hex");
    const authUrl = buildGoogleAuthUrl(state);
    const response = NextResponse.redirect(authUrl);

    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
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
        : "Gagal memulai koneksi Google.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
