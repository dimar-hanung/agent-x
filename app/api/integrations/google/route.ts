import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";
import { revokeGoogleToken } from "@/lib/google/oauth";
import {
  deleteGoogleIntegration,
  getGoogleCredentials,
  getGoogleIntegrationStatus,
} from "@/lib/integrations/google-repository";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const status = await getGoogleIntegrationStatus(user.userId);
  return NextResponse.json(status);
}

export async function DELETE() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const credentials = await getGoogleCredentials(user.userId);

  if (credentials) {
    try {
      await revokeGoogleToken(
        credentials.refreshToken || credentials.accessToken
      );
    } catch (error) {
      console.error("Failed to revoke Google token:", error);
    }
  }

  await deleteGoogleIntegration(user.userId);
  return NextResponse.json({ connected: false });
}
