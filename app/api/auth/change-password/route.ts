import { NextResponse } from "next/server";

import { UnauthorizedError, resolveUser } from "@/lib/ai/roles/resolve-user";
import {
  InvalidCurrentPasswordError,
  SamePasswordError,
  UserNotFoundError,
  changeUserPassword,
} from "@/lib/auth/change-password";
import { changePasswordSchema } from "@/lib/auth/schemas";

export async function POST(request: Request) {
  try {
    const user = await resolveUser();

    const body = await request.json().catch(() => null);
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message:
            parsed.error.issues[0]?.message ?? "Permintaan ubah password tidak valid.",
        },
        { status: 400 }
      );
    }

    await changeUserPassword(user.userId, {
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });

    return NextResponse.json({
      message: "Password berhasil diperbarui.",
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    if (error instanceof InvalidCurrentPasswordError) {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }

    if (error instanceof SamePasswordError) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (error instanceof UserNotFoundError) {
      return NextResponse.json({ message: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Gagal mengubah password." },
      { status: 500 }
    );
  }
}
