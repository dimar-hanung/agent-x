import { NextResponse } from "next/server";

import { UnauthorizedError, resolveUser } from "@/lib/ai/roles/resolve-user";
import { deleteMemory } from "@/lib/memory/repository";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await resolveUser();
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { message: "ID memory wajib diisi." },
        { status: 400 }
      );
    }

    try {
      await deleteMemory(user.userId, id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal menghapus memory.";

      if (message.includes("tidak ditemukan")) {
        return NextResponse.json({ message }, { status: 404 });
      }

      throw error;
    }

    return NextResponse.json({ message: "Preference berhasil dihapus." });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    console.error("DELETE /api/memories/[id] error:", error);
    return NextResponse.json(
      { message: "Gagal menghapus memory." },
      { status: 500 }
    );
  }
}
