import { NextResponse } from "next/server";

import { UnauthorizedError, resolveUser } from "@/lib/ai/roles/resolve-user";
import { updateProfileSchema } from "@/lib/auth/schemas";
import {
  EmailTakenError,
  UserNotFoundError,
  updateUserProfile,
} from "@/lib/auth/update-profile";

export async function PATCH(request: Request) {
  try {
    const user = await resolveUser();

    const body = await request.json().catch(() => null);
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message:
            parsed.error.issues[0]?.message ??
            "Permintaan ubah profil tidak valid.",
        },
        { status: 400 }
      );
    }

    const profile = await updateUserProfile(user.userId, parsed.data);

    return NextResponse.json({
      message: "Profil berhasil diperbarui.",
      displayName: profile.displayName,
      email: profile.email,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    if (error instanceof EmailTakenError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }

    if (error instanceof UserNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Gagal memperbarui profil." },
      { status: 500 }
    );
  }
}
