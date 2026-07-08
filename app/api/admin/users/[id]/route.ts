import { NextResponse } from "next/server";

import { deleteUser, updateUser } from "@/lib/admin/users/repository";
import { updateAdminUserSchema } from "@/lib/admin/users/schemas";
import { requireAdminUser } from "@/lib/auth/require-admin";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, context: RouteContext) {
  const auth = await requireAdminUser();

  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Body JSON tidak valid." }, { status: 400 });
  }

  const parsed = updateAdminUserSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Data tidak valid.";
    return NextResponse.json({ message: firstError }, { status: 400 });
  }

  try {
    const user = await updateUser(id, parsed.data);
    return NextResponse.json({ user, message: "User berhasil diperbarui." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gagal memperbarui user.";

    if (message.includes("tidak ditemukan")) {
      return NextResponse.json({ message }, { status: 404 });
    }

    if (message.includes("sudah terdaftar") || message.includes("tidak dapat")) {
      return NextResponse.json({ message }, { status: 409 });
    }

    if (message.includes("nomor HP") || message.includes("Nomor HP")) {
      return NextResponse.json({ message }, { status: 400 });
    }

    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const auth = await requireAdminUser();

  if (auth.error) {
    return auth.error;
  }

  const { id } = await context.params;

  try {
    await deleteUser(id, auth.user.userId);
    return NextResponse.json({ message: "User berhasil dihapus." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghapus user.";

    if (message.includes("tidak ditemukan")) {
      return NextResponse.json({ message }, { status: 404 });
    }

    if (message.includes("tidak dapat")) {
      return NextResponse.json({ message }, { status: 409 });
    }

    return NextResponse.json({ message }, { status: 500 });
  }
}
