import { NextResponse } from "next/server";

import { UnauthorizedError, resolveUser } from "@/lib/ai/roles/resolve-user";
import { revokeApiKey } from "@/lib/api-keys/repository";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await resolveUser();
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { message: "ID API key wajib diisi." },
        { status: 400 }
      );
    }

    const revoked = await revokeApiKey(user.userId, id);

    if (!revoked) {
      return NextResponse.json(
        { message: "API key tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "API key berhasil dicabut." });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    console.error("DELETE /api/integrations/api-keys/[id] error:", error);
    return NextResponse.json(
      { message: "Gagal mencabut API key." },
      { status: 500 }
    );
  }
}
