import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  exchangeGoogleAuthCode,
} from "@/lib/google/oauth";
import { upsertGoogleIntegration } from "@/lib/integrations/google-repository";

function settingsRedirect(query?: Record<string, string>) {
  const url = new URL(
    "/dashboard/settings",
    process.env.AGENTX_PUBLIC_URL ?? "http://localhost:8701"
  );

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }

  return url;
}

export async function GET(req: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.redirect(
      settingsRedirect({ google: "unauthorized" })
    );
  }

  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const oauthError = requestUrl.searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

  const clearState = (response: NextResponse) => {
    response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  };

  if (oauthError) {
    return clearState(
      NextResponse.redirect(settingsRedirect({ google: "denied" }))
    );
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return clearState(
      NextResponse.redirect(settingsRedirect({ google: "invalid_state" }))
    );
  }

  try {
    const tokens = await exchangeGoogleAuthCode(code);

    await upsertGoogleIntegration(user.userId, {
      email: tokens.email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      scopes: tokens.scopes,
      tokenExpiresAt: tokens.expiryDate
        ? new Date(tokens.expiryDate)
        : null,
    });

    return clearState(
      NextResponse.redirect(settingsRedirect({ google: "connected" }))
    );
  } catch (error) {
    console.error("Google OAuth callback failed:", error);
    return clearState(
      NextResponse.redirect(settingsRedirect({ google: "error" }))
    );
  }
}
