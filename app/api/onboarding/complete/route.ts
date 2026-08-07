import { NextResponse } from "next/server";

import {
  UnauthorizedError,
  resolveUser,
} from "@/lib/ai/roles/resolve-user";
import {
  OnboardingNotApplicableError,
  completeClientOnboarding,
} from "@/lib/onboarding/repository";
import { appRoutes } from "@/lib/site-config";

export async function POST() {
  try {
    const user = await resolveUser();

    if (user.role !== "client") {
      return NextResponse.json(
        { message: "Panduan ini khusus akun client." },
        { status: 403 }
      );
    }

    await completeClientOnboarding(user.userId);

    return NextResponse.json({
      message: "Panduan selesai.",
      redirectTo: appRoutes.dashboard,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    if (error instanceof OnboardingNotApplicableError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { message: "Gagal menyelesaikan panduan." },
      { status: 500 }
    );
  }
}
