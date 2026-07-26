import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import { upsertMicrosoftIntegration } from "@/lib/integrations/microsoft-repository";
import {
  MICROSOFT_OAUTH_STATE_COOKIE,
  exchangeMicrosoftAuthCode,
} from "@/lib/microsoft/oauth";

function settingsRedirect(query?: Record<string, string>) {
  const url = new URL(
    "/dashboard/settings",
    process.env.AGENTX_PUBLIC_URL ?? "http://localhost:3000"
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
      settingsRedirect({ microsoft: "unauthorized" })
    );
  }

  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const oauthError = requestUrl.searchParams.get("error");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(MICROSOFT_OAUTH_STATE_COOKIE)?.value;

  const clearState = (response: NextResponse) => {
    response.cookies.set(MICROSOFT_OAUTH_STATE_COOKIE, "", {
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
      NextResponse.redirect(settingsRedirect({ microsoft: "denied" }))
    );
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return clearState(
      NextResponse.redirect(settingsRedirect({ microsoft: "invalid_state" }))
    );
  }

  try {
    const tokens = await exchangeMicrosoftAuthCode(code);

    await upsertMicrosoftIntegration(user.userId, {
      email: tokens.email,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      scopes: tokens.scopes,
      tokenExpiresAt: tokens.expiryDate
        ? new Date(tokens.expiryDate)
        : null,
    });

    return clearState(
      NextResponse.redirect(settingsRedirect({ microsoft: "connected" }))
    );
  } catch (error) {
    console.error("Microsoft OAuth callback failed:", error);
    return clearState(
      NextResponse.redirect(settingsRedirect({ microsoft: "error" }))
    );
  }
}
